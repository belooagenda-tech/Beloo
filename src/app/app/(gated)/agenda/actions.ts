"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { createPreference, refundPayment } from "@/lib/mercadopago/client";
import { pushAppointmentToGoogle } from "@/lib/google-calendar/sync";
import { logError } from "@/lib/logger";

export type CancelFromAgendaResult =
  | { ok: true; avisoReembolso?: string; pagamentoRemovido: boolean }
  | { ok: false; error: string };

export async function cancelAppointmentFromAgendaAction(
  appointmentId: string,
  motivo?: string,
): Promise<CancelFromAgendaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!business) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, status, entrada_status, mp_payment_id")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appointment) {
    return { ok: false, error: "Agendamento não encontrado." };
  }

  // Só pode cancelar antes do atendimento acontecer. Isso também protege a
  // lógica de estorno abaixo: um agendamento concluído pode ter um pagamento
  // "misto" (entrada + valor cobrado na hora) — reembolsar só a entrada via
  // Mercado Pago e apagar o registro inteiro apagaria da receita um valor
  // que realmente entrou (o cobrado presencialmente).
  if (appointment.status !== "agendado" && appointment.status !== "confirmado") {
    return { ok: false, error: "Esse agendamento não pode mais ser cancelado." };
  }

  const motivoNormalizado = motivo?.trim() || null;
  const { error: updateError } = await admin
    .from("appointments")
    .update({ status: "cancelado", motivo_cancelamento: motivoNormalizado })
    .eq("id", appointmentId);
  if (updateError) {
    return { ok: false, error: "Não foi possível cancelar. Tente novamente." };
  }

  await pushAppointmentToGoogle(admin, business.id, appointmentId);

  let avisoReembolso: string | undefined;
  let pagamentoRemovido = false;
  if (appointment.entrada_status === "pago" && appointment.mp_payment_id) {
    try {
      const accessToken = await getValidAccessToken(admin, business.id);
      if (!accessToken) throw new Error("sem conexão Mercado Pago");
      await refundPayment(accessToken, appointment.mp_payment_id);
      await admin
        .from("appointments")
        .update({ entrada_status: "reembolsado" })
        .eq("id", appointmentId);
      // O dinheiro voltou para o cliente — remove o registro de receita da
      // entrada para não aparecer mais como faturado na aba Financeiro.
      await admin.from("appointment_payments").delete().eq("appointment_id", appointmentId);
      pagamentoRemovido = true;
    } catch (err) {
      console.error("Beloo: falha ao reembolsar entrada automaticamente (Agenda)", err);
      avisoReembolso =
        "O agendamento foi cancelado, mas o reembolso automático da entrada falhou — verifique manualmente no Mercado Pago.";
    }
  }

  return { ok: true, avisoReembolso, pagamentoRemovido };
}

export type CreateAdvancePaymentLinkResult =
  | { ok: true; paymentUrl: string; valor: number }
  | { ok: false; error: string };

// Gera um link de pagamento (Mercado Pago Checkout Pro) para o cliente pagar
// antes do atendimento — seja uma parte (percentual) ou o valor cheio (100%),
// à escolha do profissional para AQUELE agendamento específico, diferente do
// percentual fixo configurado em Configurações (que só se aplica ao criar um
// agendamento pelo link público).
//
// Reaproveita as colunas entrada_status/entrada_valor/mp_payment_id/
// mp_preference_id que já existem em `appointments` — o significado passa a
// ser "valor pago antecipadamente online", não só "entrada paga no ato do
// agendamento público". Isso é o que permite reusar sem nenhuma mudança o
// resto da cadeia que já lê essas colunas: appointment-card (aviso de
// "entrada paga"), payment-modal (desconta do valor a cobrar na conclusão) e
// o reembolso automático ao cancelar.
//
// Propositalmente NÃO reusa handleAppointmentDeposit (o webhook da entrada no
// ato do agendamento): aquele handler cancela o agendamento se o pagamento é
// recusado e volta o status para "agendado" na aprovação — comportamento
// errado aqui, onde o agendamento já existia e continua confirmado
// independente do resultado dessa cobrança. Por isso o webhook usa um
// handler novo e isolado, gated por um query param diferente (?saldo=).
export async function createAdvancePaymentLinkAction(
  appointmentId: string,
  percentual: number,
): Promise<CreateAdvancePaymentLinkResult> {
  if (!Number.isInteger(percentual) || percentual < 1 || percentual > 100) {
    return { ok: false, error: "Percentual inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("profile_id", user.id)
    .single();
  if (!business) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, service_id, status, entrada_status")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appointment) {
    return { ok: false, error: "Agendamento não encontrado." };
  }
  if (appointment.status !== "agendado" && appointment.status !== "confirmado") {
    return { ok: false, error: "Esse agendamento não pode mais receber uma cobrança online." };
  }
  // "pendente" é permitido de novo — cobre o caso do profissional gerar um
  // novo link porque o cliente perdeu o anterior. "pago" bloqueia porque já
  // foi resolvido (some para "Editar pagamento" ao concluir o atendimento).
  if (appointment.entrada_status === "pago") {
    return { ok: false, error: "Esse agendamento já está com o pagamento online concluído." };
  }

  const { data: service } = await admin
    .from("services")
    .select("nome, preco")
    .eq("id", appointment.service_id)
    .single();
  if (!service) {
    return { ok: false, error: "Serviço não encontrado." };
  }

  const accessToken = await getValidAccessToken(admin, business.id);
  if (!accessToken) {
    return {
      ok: false,
      error: "Conecte sua conta do Mercado Pago em Configurações antes de cobrar online.",
    };
  }

  const valor = Math.round(service.preco * percentual) / 100;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const preference = await createPreference(accessToken, {
      title: percentual < 100 ? `${service.nome} — entrada` : service.nome,
      amount: valor,
      externalReference: appointmentId,
      successUrl: `${siteUrl}/${business.slug}/confirmacao?a=${appointmentId}`,
      failureUrl: `${siteUrl}/${business.slug}?pagamento=falhou`,
      pendingUrl: `${siteUrl}/${business.slug}/confirmacao?a=${appointmentId}`,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago?saldo=${appointmentId}`,
    });

    await admin
      .from("appointments")
      .update({
        entrada_status: "pendente",
        entrada_valor: valor,
        mp_preference_id: preference.id,
      })
      .eq("id", appointmentId);

    return { ok: true, paymentUrl: preference.initPoint, valor };
  } catch (err) {
    logError("agenda.cobranca_antecipada.criar_preferencia", err, { appointmentId });
    return { ok: false, error: "Não foi possível gerar o link de pagamento. Tente novamente." };
  }
}
