"use server";

import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailableSlotsForService } from "@/lib/booking/get-available-slots";
import { normalizePhone, isValidBrazilianPhone } from "@/lib/phone";
import { clientInfoSchema } from "@/lib/validations/public-booking";
import { notifyProfessional } from "@/lib/push/notify";
import { ENTRADA_EXPIRACAO_MINUTOS } from "@/lib/constants";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { createPreference, refundPayment } from "@/lib/mercadopago/client";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import type { AppointmentStatus } from "@/lib/supabase/types";

export async function findClientNameByPhoneAction(
  slug: string,
  telefone: string,
): Promise<{ nome: string } | null> {
  if (!isValidBrazilianPhone(telefone)) return null;

  // Busca por telefone revela se um número está cadastrado como cliente —
  // limita tentativas de varredura (achado 🔴 da auditoria de 2026-08-07).
  const dentroDoLimite = await checkRateLimit("public_find_client", { windowSeconds: 10 * 60, maxAttempts: 20 });
  if (!dentroDoLimite) return null;

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("nome")
    .eq("business_id", business.id)
    .eq("telefone", normalizePhone(telefone))
    .maybeSingle();

  return client ? { nome: client.nome } : null;
}

type ClientPushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };
type SubscribeClientPushResult = { ok: true } | { ok: false; error: string };

async function upsertClientPushSubscription(
  clientId: string,
  subscription: ClientPushSubscriptionInput,
): Promise<SubscribeClientPushResult> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { client_id: clientId, endpoint: subscription.endpoint, keys: subscription.keys },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: "Não foi possível ativar as notificações." };
  return { ok: true };
}

// Usado na página de confirmação — o cliente já está identificado pelo
// próprio agendamento que acabou de criar (o UUID na URL funciona como
// identificador, mesmo padrão de confiança já usado no resto dessa página).
export async function subscribeClientPushByAppointmentAction(
  slug: string,
  appointmentId: string,
  subscription: ClientPushSubscriptionInput,
): Promise<SubscribeClientPushResult> {
  const supabase = createAdminClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("client_id, business_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Agendamento não encontrado." };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!business || business.id !== appointment.business_id) {
    return { ok: false, error: "Agendamento não encontrado." };
  }

  return upsertClientPushSubscription(appointment.client_id, subscription);
}

// Usado em "meus agendamentos" — o cliente já se identificou pelo telefone
// na busca; resolvemos o client_id de novo aqui em vez de confiar em algo
// vindo do browser, mesma cautela do resto do fluxo público.
export async function subscribeClientPushByPhoneAction(
  slug: string,
  telefone: string,
  subscription: ClientPushSubscriptionInput,
): Promise<SubscribeClientPushResult> {
  if (!isValidBrazilianPhone(telefone)) {
    return { ok: false, error: "Telefone inválido." };
  }

  const dentroDoLimite = await checkRateLimit("public_push_subscribe", { windowSeconds: 10 * 60, maxAttempts: 20 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", business.id)
    .eq("telefone", normalizePhone(telefone))
    .maybeSingle();
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  return upsertClientPushSubscription(client.id, subscription);
}

export async function getAvailableSlotsAction(
  slug: string,
  serviceId: string,
): Promise<Record<string, string[]>> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return {};

  const slots = await getAvailableSlotsForService(business.id, serviceId);
  return slots ?? {};
}

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string; pagamentoUrl?: string }
  | { ok: false; error: string };

const MAX_AGENDAMENTOS_FUTUROS_POR_CLIENTE = 6;

export async function createAppointmentAction(input: {
  slug: string;
  serviceId: string;
  inicioISO: string;
  nome: string;
  telefone: string;
  empresa?: string;
}): Promise<CreateAppointmentResult> {
  // Campo-armadilha preenchido = formulário automatizado. Devolve o mesmo
  // erro genérico de sempre, sem revelar que foi detectado como bot.
  if (input.empresa) {
    return { ok: false, error: "Não foi possível concluir o agendamento. Tente novamente." };
  }

  const dentroDoLimite = await checkRateLimit("public_create_appointment", { windowSeconds: 15 * 60, maxAttempts: 15 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const parsed = clientInfoSchema.safeParse({ nome: input.nome, telefone: input.telefone });
  if (!parsed.success) {
    return { ok: false, error: "Confira seu nome e WhatsApp e tente novamente." };
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, profile_id, timezone, entrada_ativa, entrada_percentual")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: service } = await supabase
    .from("services")
    .select("id, nome, duracao_min, preco, ativo")
    .eq("id", input.serviceId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!service || !service.ativo) {
    return { ok: false, error: "Esse serviço não está mais disponível." };
  }

  const slots = await getAvailableSlotsForService(business.id, service.id);
  const disponivel = Object.values(slots ?? {}).some((horarios) =>
    horarios.includes(input.inicioISO),
  );
  if (!disponivel) {
    return { ok: false, error: "Esse horário não está mais disponível. Escolha outro." };
  }

  const inicio = new Date(input.inicioISO);
  const fim = addMinutes(inicio, service.duracao_min);
  const telefoneNormalizado = normalizePhone(parsed.data.telefone);

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id, nome")
    .eq("business_id", business.id)
    .eq("telefone", telefoneNormalizado)
    .maybeSingle();

  let clientId = existingClient?.id;
  const clientNome = existingClient?.nome ?? parsed.data.nome;

  if (!clientId) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ business_id: business.id, nome: parsed.data.nome, telefone: telefoneNormalizado })
      .select("id")
      .single();
    if (clientError || !newClient) {
      return { ok: false, error: "Não foi possível concluir o agendamento. Tente novamente." };
    }
    clientId = newClient.id;
  } else {
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("status", ["agendado", "confirmado"])
      .gt("inicio", new Date().toISOString());

    if ((count ?? 0) >= MAX_AGENDAMENTOS_FUTUROS_POR_CLIENTE) {
      return {
        ok: false,
        error:
          "Você já tem vários agendamentos futuros com essa loja. Cancele algum antes de criar outro, ou fale direto com a loja.",
      };
    }
  }

  let entradaAccessToken: string | null = null;
  const requerEntrada = business.entrada_ativa && business.entrada_percentual > 0;
  if (requerEntrada) {
    entradaAccessToken = await getValidAccessToken(supabase, business.id);
    if (!entradaAccessToken) {
      // Loja marcou entrada ativa mas a conexão do Mercado Pago sumiu (ex.:
      // token revogado externamente) — não trava o cliente, só segue sem
      // cobrar entrada e avisa no log do servidor para o time investigar.
      logError("public_booking.entrada_sem_conexao_mp", new Error("Conexão MP ausente/inválida"), {
        businessId: business.id,
      });
    }
  }
  const cobrarEntrada = requerEntrada && entradaAccessToken;

  const entradaValor = cobrarEntrada
    ? Math.round(service.preco * business.entrada_percentual) / 100
    : null;

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      business_id: business.id,
      client_id: clientId,
      service_id: service.id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: cobrarEntrada ? "aguardando_pagamento" : "agendado",
      entrada_status: cobrarEntrada ? "pendente" : "nao_aplicavel",
      entrada_valor: entradaValor,
      entrada_expira_em: cobrarEntrada
        ? addMinutes(new Date(), ENTRADA_EXPIRACAO_MINUTOS).toISOString()
        : null,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return {
      ok: false,
      error:
        appointmentError?.code === "23P01"
          ? "Esse horário acabou de ser preenchido por outro cliente. Escolha outro horário."
          : "Não foi possível concluir o agendamento. Tente novamente.",
    };
  }

  if (cobrarEntrada && entradaAccessToken && entradaValor) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    try {
      const preference = await createPreference(entradaAccessToken, {
        title: `Entrada — ${service.nome}`,
        amount: entradaValor,
        externalReference: appointment.id,
        successUrl: `${siteUrl}/${input.slug}/confirmacao?a=${appointment.id}`,
        failureUrl: `${siteUrl}/${input.slug}?pagamento=falhou`,
        pendingUrl: `${siteUrl}/${input.slug}/confirmacao?a=${appointment.id}`,
        notificationUrl: `${siteUrl}/api/webhooks/mercadopago?appointment=${appointment.id}`,
      });

      await supabase
        .from("appointments")
        .update({ mp_preference_id: preference.id })
        .eq("id", appointment.id);

      return { ok: true, appointmentId: appointment.id, pagamentoUrl: preference.initPoint };
    } catch (err) {
      logError("public_booking.criar_preferencia_mp", err, {
        businessId: business.id,
        appointmentId: appointment.id,
      });
      // Libera o horário — sem link de pagamento não há como o cliente
      // confirmar esse agendamento.
      await supabase.from("appointments").delete().eq("id", appointment.id);
      return {
        ok: false,
        error: "Não foi possível iniciar o pagamento da entrada. Tente novamente.",
      };
    }
  }

  const horario = formatInTimeZone(inicio, business.timezone, "dd/MM 'às' HH:mm");
  try {
    await notifyProfessional(supabase, {
      profileId: business.profile_id,
      tipo: "novo_agendamento",
      titulo: "Novo agendamento",
      corpo: `${clientNome} agendou ${service.nome} para ${horario}.`,
      appointmentId: appointment.id,
      url: "/app/agenda",
    });
  } catch {
    // O agendamento já foi criado com sucesso; falha ao notificar não pode
    // derrubar a resposta para o cliente.
  }

  return { ok: true, appointmentId: appointment.id };
}

export type PublicAppointmentSummary = {
  id: string;
  servicoNome: string;
  inicio: string;
  status: AppointmentStatus;
  podeCancelar: boolean;
};

export type FindAppointmentsResult =
  | { ok: true; agendamentos: PublicAppointmentSummary[] }
  | { ok: false; error: string };

export async function findAppointmentsAction(
  slug: string,
  telefone: string,
): Promise<FindAppointmentsResult> {
  if (!isValidBrazilianPhone(telefone)) {
    return { ok: false, error: "Informe um WhatsApp válido com DDD." };
  }

  const dentroDoLimite = await checkRateLimit("public_find_appointments", { windowSeconds: 10 * 60, maxAttempts: 20 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const supabase = createAdminClient();
  const telefoneNormalizado = normalizePhone(telefone);

  const { data: business } = await supabase
    .from("businesses")
    .select("id, cancelamento_min_horas")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", business.id)
    .eq("telefone", telefoneNormalizado)
    .maybeSingle();
  if (!client) return { ok: true, agendamentos: [] };

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, service_id, inicio, status")
    .eq("client_id", client.id)
    .in("status", ["agendado", "confirmado"])
    .gt("inicio", new Date().toISOString())
    .order("inicio", { ascending: true });

  const serviceIds = [...new Set((appointments ?? []).map((a) => a.service_id))];
  const { data: services } =
    serviceIds.length > 0
      ? await supabase.from("services").select("id, nome").in("id", serviceIds)
      : { data: [] };
  const servicoNomeById = new Map((services ?? []).map((s) => [s.id, s.nome]));

  const limiteMs = business.cancelamento_min_horas * 60 * 60_000;
  const agora = Date.now();

  const agendamentos: PublicAppointmentSummary[] = (appointments ?? []).map((a) => ({
    id: a.id,
    servicoNome: servicoNomeById.get(a.service_id) ?? "Serviço",
    inicio: a.inicio,
    status: a.status,
    podeCancelar: new Date(a.inicio).getTime() - agora >= limiteMs,
  }));

  return { ok: true, agendamentos };
}

export type CancelAppointmentResult = { ok: true } | { ok: false; error: string };

export async function cancelAppointmentAction(
  slug: string,
  appointmentId: string,
  telefone: string,
): Promise<CancelAppointmentResult> {
  // O telefone é o único fator de confirmação nesse fluxo público — sem
  // limite de tentativas, dá pra varrer números até acertar um cliente real
  // (achado 🔴 da auditoria de 2026-08-07).
  const dentroDoLimite = await checkRateLimit("public_cancel_appointment", { windowSeconds: 15 * 60, maxAttempts: 10 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const supabase = createAdminClient();
  const telefoneNormalizado = normalizePhone(telefone);

  const { data: business } = await supabase
    .from("businesses")
    .select("id, profile_id, timezone, cancelamento_min_horas")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, inicio, status, entrada_status, mp_payment_id")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Agendamento não encontrado." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, nome, telefone")
    .eq("id", appointment.client_id)
    .maybeSingle();
  if (!client || client.telefone !== telefoneNormalizado) {
    return { ok: false, error: "Não foi possível confirmar seus dados." };
  }

  if (appointment.status !== "agendado" && appointment.status !== "confirmado") {
    return { ok: false, error: "Esse agendamento não pode mais ser cancelado." };
  }

  const limiteMs = business.cancelamento_min_horas * 60 * 60_000;
  if (new Date(appointment.inicio).getTime() - Date.now() < limiteMs) {
    return {
      ok: false,
      error: `Esse agendamento só pode ser cancelado até ${business.cancelamento_min_horas}h antes do horário marcado. Entre em contato direto com a loja.`,
    };
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelado" })
    .eq("id", appointmentId);
  if (updateError) {
    return { ok: false, error: "Não foi possível cancelar. Tente novamente." };
  }

  let avisoReembolso = "";
  if (appointment.entrada_status === "pago" && appointment.mp_payment_id) {
    try {
      const accessToken = await getValidAccessToken(supabase, business.id);
      if (!accessToken) throw new Error("sem conexão Mercado Pago");
      await refundPayment(accessToken, appointment.mp_payment_id);
      await supabase
        .from("appointments")
        .update({ entrada_status: "reembolsado" })
        .eq("id", appointmentId);
      // O dinheiro voltou para o cliente — remove o registro de receita da
      // entrada para não aparecer mais como faturado na aba Financeiro.
      await supabase.from("appointment_payments").delete().eq("appointment_id", appointmentId);
    } catch (err) {
      logError("public_booking.reembolso_automatico", err, {
        businessId: business.id,
        appointmentId,
      });
      avisoReembolso = " O reembolso automático da entrada falhou — verifique manualmente no Mercado Pago.";
    }
  }

  const { data: service } = await supabase
    .from("services")
    .select("nome")
    .eq("id", appointment.service_id)
    .maybeSingle();
  const horario = formatInTimeZone(new Date(appointment.inicio), business.timezone, "dd/MM 'às' HH:mm");

  try {
    await notifyProfessional(supabase, {
      profileId: business.profile_id,
      tipo: "cancelamento",
      titulo: "Agendamento cancelado",
      corpo: `${client.nome} cancelou ${service?.nome ?? "um atendimento"} de ${horario}.${avisoReembolso}`,
      appointmentId: appointment.id,
      url: "/app/agenda",
    });
  } catch {
    // O cancelamento já foi aplicado; falha ao notificar não pode
    // derrubar a resposta para o cliente.
  }

  return { ok: true };
}
