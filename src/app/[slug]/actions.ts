"use server";

import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailableSlotsForService } from "@/lib/booking/get-available-slots";
import { normalizePhone, isValidBrazilianPhone } from "@/lib/phone";
import { clientInfoSchema } from "@/lib/validations/public-booking";
import { notifyProfessional } from "@/lib/push/notify";
import type { AppointmentStatus } from "@/lib/supabase/types";

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
  | { ok: true; appointmentId: string }
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

  const parsed = clientInfoSchema.safeParse({ nome: input.nome, telefone: input.telefone });
  if (!parsed.success) {
    return { ok: false, error: "Confira seu nome e WhatsApp e tente novamente." };
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, profile_id, timezone")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: service } = await supabase
    .from("services")
    .select("id, nome, duracao_min, ativo")
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

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      business_id: business.id,
      client_id: clientId,
      service_id: service.id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: "agendado",
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
    .select("id, client_id, service_id, inicio, status")
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
      corpo: `${client.nome} cancelou ${service?.nome ?? "um atendimento"} de ${horario}.`,
      appointmentId: appointment.id,
      url: "/app/agenda",
    });
  } catch {
    // O cancelamento já foi aplicado; falha ao notificar não pode
    // derrubar a resposta para o cliente.
  }

  return { ok: true };
}
