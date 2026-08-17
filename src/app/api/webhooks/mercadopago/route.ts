import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addDays, addMonths, formatISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook-signature";
import { getPayment, getPreapproval, platformAccessToken, refundPayment } from "@/lib/mercadopago/client";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { notifyProfessional } from "@/lib/push/notify";
import { logError } from "@/lib/logger";
import { getMetaUserDataForBusiness, sendCancelSubscriptionEvent, sendSubscribeEvent } from "@/lib/meta-ads/capi";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Admin = SupabaseClient<Database>;

async function handleAppointmentDeposit(admin: Admin, appointmentId: string, dataId: string) {
  const { data: appointment } = await admin
    .from("appointments")
    .select("id, business_id, client_id, service_id, entrada_status, entrada_valor")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) {
    // Nada a fazer — respondemos 200 para o Mercado Pago não ficar retentando.
    return NextResponse.json({ ok: true });
  }

  // Idempotência: se a entrada já foi resolvida (paga/reembolsada/expirada),
  // não reprocessa — evita duplicar notificação em reentregas do webhook.
  if (appointment.entrada_status !== "pendente") {
    return NextResponse.json({ ok: true });
  }

  const accessToken = await getValidAccessToken(admin, appointment.business_id);
  if (!accessToken) {
    return new NextResponse("No Mercado Pago connection", { status: 409 });
  }

  const payment = await getPayment(accessToken, dataId).catch((err) => {
    logError("mp_webhook.entrada.consultar_pagamento", err, { appointmentId, dataId });
    return null;
  });
  if (!payment || payment.externalReference !== appointment.id) {
    return new NextResponse("Payment mismatch", { status: 400 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("profile_id, timezone")
    .eq("id", appointment.business_id)
    .single();

  if (payment.status === "approved") {
    await admin
      .from("appointments")
      .update({ status: "agendado", entrada_status: "pago", mp_payment_id: payment.id })
      .eq("id", appointment.id);

    // Registra a entrada já em appointment_payments — a Agenda e a aba
    // Financeiro passam a contar esse dinheiro assim que ele realmente entra,
    // em vez de só quando o profissional "concluir e receber" o atendimento
    // depois. Se o atendimento já tiver sido concluído sem passar por aqui
    // (não deveria acontecer, mas por segurança), não sobrescreve o registro.
    const entradaValor = appointment.entrada_valor ?? payment.transactionAmount;
    await admin.from("appointment_payments").upsert(
      {
        appointment_id: appointment.id,
        valor: entradaValor,
        forma_pagamento: "entrada_mp",
        origem: "avulso",
        entrada_valor: entradaValor,
        pago_em: new Date().toISOString(),
      },
      { onConflict: "appointment_id", ignoreDuplicates: true },
    );

    if (business) {
      const [{ data: client }, { data: service }] = await Promise.all([
        admin.from("clients").select("nome").eq("id", appointment.client_id).maybeSingle(),
        admin.from("services").select("nome").eq("id", appointment.service_id).maybeSingle(),
      ]);
      try {
        await notifyProfessional(admin, {
          profileId: business.profile_id,
          tipo: "entrada_paga",
          titulo: "Entrada paga",
          corpo: `${client?.nome ?? "Cliente"} pagou a entrada de ${service?.nome ?? "um atendimento"} e o horário está confirmado.`,
          appointmentId: appointment.id,
          url: "/app/agenda",
        });
      } catch {
        // não bloqueia a confirmação do pagamento
      }
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin
      .from("appointments")
      .update({ status: "cancelado", entrada_status: "expirado", mp_payment_id: payment.id })
      .eq("id", appointment.id);
  }
  // outros status (pending, in_process) — não faz nada, espera a próxima notificação.

  return NextResponse.json({ ok: true });
}

// Pagamento antecipado cobrado depois que o agendamento já existia — gerado
// pela Agenda (agenda/actions.ts → createAdvancePaymentLinkAction), NÃO pelo
// fluxo de agendamento público. Propositalmente um handler à parte de
// handleAppointmentDeposit: aqui o agendamento já estava confirmado antes da
// cobrança, então o resultado do pagamento nunca deve mexer em
// appointments.status — nem voltar pra "agendado" na aprovação (perderia um
// "confirmado" já existente), nem cancelar na recusa (o cliente já tinha um
// horário garantido, só a cobrança falhou).
async function handleAppointmentAdvancePayment(admin: Admin, appointmentId: string, dataId: string) {
  const { data: appointment } = await admin
    .from("appointments")
    .select("id, business_id, client_id, service_id, status, entrada_status, entrada_valor")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) {
    return NextResponse.json({ ok: true });
  }

  // Idempotência: só processa enquanto a cobrança está "pendente" — evita
  // reprocessar em reentregas do webhook.
  if (appointment.entrada_status !== "pendente") {
    return NextResponse.json({ ok: true });
  }

  const accessToken = await getValidAccessToken(admin, appointment.business_id);
  if (!accessToken) {
    return new NextResponse("No Mercado Pago connection", { status: 409 });
  }

  const payment = await getPayment(accessToken, dataId).catch((err) => {
    logError("mp_webhook.saldo.consultar_pagamento", err, { appointmentId, dataId });
    return null;
  });
  if (!payment || payment.externalReference !== appointment.id) {
    return new NextResponse("Payment mismatch", { status: 400 });
  }

  if (payment.status === "approved") {
    // Se o agendamento foi cancelado enquanto essa cobrança ainda estava em
    // aberto, o dinheiro não pode ficar retido — devolve na hora em vez de
    // marcar como pago.
    if (appointment.status !== "agendado" && appointment.status !== "confirmado") {
      await refundPayment(accessToken, payment.id).catch((err) => {
        logError("mp_webhook.saldo.reembolso_automatico", err, { appointmentId, paymentId: payment.id });
      });
      await admin
        .from("appointments")
        .update({ entrada_status: "reembolsado", mp_payment_id: payment.id })
        .eq("id", appointment.id);
      return NextResponse.json({ ok: true });
    }

    const valorPago = appointment.entrada_valor ?? payment.transactionAmount;
    await admin
      .from("appointments")
      .update({ entrada_status: "pago", entrada_valor: valorPago, mp_payment_id: payment.id })
      .eq("id", appointment.id);

    // Mesmo padrão da entrada no ato do agendamento: registra a receita já em
    // appointment_payments assim que o dinheiro entra, sem esperar o
    // profissional "concluir e receber" depois. complete_appointment_payment
    // usa upsert por appointment_id, então não colide com esse registro.
    await admin.from("appointment_payments").upsert(
      {
        appointment_id: appointment.id,
        valor: valorPago,
        forma_pagamento: "entrada_mp",
        origem: "avulso",
        entrada_valor: valorPago,
        pago_em: new Date().toISOString(),
      },
      { onConflict: "appointment_id", ignoreDuplicates: true },
    );

    const { data: business } = await admin
      .from("businesses")
      .select("profile_id")
      .eq("id", appointment.business_id)
      .maybeSingle();
    if (business) {
      const [{ data: client }, { data: service }] = await Promise.all([
        admin.from("clients").select("nome").eq("id", appointment.client_id).maybeSingle(),
        admin.from("services").select("nome, preco").eq("id", appointment.service_id).maybeSingle(),
      ]);
      const quitado = service ? valorPago >= service.preco : false;
      try {
        await notifyProfessional(admin, {
          profileId: business.profile_id,
          tipo: "entrada_paga",
          titulo: quitado ? "Pagamento recebido" : "Pagamento antecipado recebido",
          corpo: `${client?.nome ?? "Cliente"} pagou ${quitado ? "o valor total" : "um valor antecipado"} de ${service?.nome ?? "um atendimento"} pelo link enviado.`,
          appointmentId: appointment.id,
          url: "/app/agenda",
        });
      } catch {
        // não bloqueia a confirmação do pagamento
      }
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    // Diferente da entrada no ato do agendamento: aqui o agendamento já
    // existia antes da cobrança, então uma recusa só libera pra tentar cobrar
    // de novo — nunca cancela o horário do cliente.
    await admin
      .from("appointments")
      .update({ entrada_status: "nao_aplicavel", mp_payment_id: payment.id })
      .eq("id", appointment.id);
  }
  // outros status (pending, in_process) — não faz nada, espera a próxima notificação.

  return NextResponse.json({ ok: true });
}

// Ciclo de plano pago por Pix (Checkout Pro avulso, um por mês) — mesmo
// mecanismo de notification_url por-requisição da entrada, então
// external_reference/notification_url são confiáveis aqui.
async function handlePlanCyclePix(admin: Admin, planSubId: string, ciclo: string | null, dataId: string) {
  if (!ciclo) return new NextResponse("Bad Request", { status: 400 });

  const { data: paymentRow } = await admin
    .from("client_plan_payments")
    .select("id, status, business_id")
    .eq("plan_sub_id", planSubId)
    .eq("ciclo_referencia", ciclo)
    .maybeSingle();
  if (!paymentRow || paymentRow.status !== "pendente") {
    return NextResponse.json({ ok: true });
  }

  const accessToken = await getValidAccessToken(admin, paymentRow.business_id);
  if (!accessToken) return new NextResponse("No Mercado Pago connection", { status: 409 });

  const payment = await getPayment(accessToken, dataId).catch(() => null);
  if (!payment) return new NextResponse("Payment lookup failed", { status: 400 });

  if (payment.status === "approved") {
    await admin
      .from("client_plan_payments")
      .update({ status: "pago", mp_payment_id: payment.id, pago_em: new Date().toISOString() })
      .eq("id", paymentRow.id);

    const { data: sub } = await admin
      .from("client_plan_subs")
      .select("id, plan_id")
      .eq("id", planSubId)
      .maybeSingle();
    if (sub) {
      const { data: plan } = await admin
        .from("client_plans")
        .select("ciclo_dias")
        .eq("id", sub.plan_id)
        .maybeSingle();
      if (plan) {
        await admin
          .from("client_plan_subs")
          .update({
            ativo: true,
            pagamento_status: "ativo",
            data_renovacao: formatISO(addDays(new Date(ciclo), plan.ciclo_dias), {
              representation: "date",
            }),
            creditos_usados: {},
          })
          .eq("id", planSubId);
      }
    }
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin
      .from("client_plan_payments")
      .update({ status: "falhou", mp_payment_id: payment.id })
      .eq("id", paymentRow.id);
  }

  return NextResponse.json({ ok: true });
}

// Assinatura recorrente no cartão (Preapproval). Diferente do Checkout Pro,
// não temos garantia de que notification_url por-requisição é respeitado
// nas cobranças automáticas seguintes — por isso o mecanismo confiável aqui
// é reconsultar o preapproval e comparar quantos ciclos ele já cobrou
// (summarized.charged_quantity) contra quantos já registramos como pagos,
// em vez de tentar casar um pagamento avulso por external_reference.
async function handlePreapprovalNotification(admin: Admin, preapprovalId: string) {
  const { data: sub } = await admin
    .from("client_plan_subs")
    .select("id, plan_id, pagamento_status, data_renovacao")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (!sub) return handleSaasPreapprovalNotification(admin, preapprovalId);

  const { data: plan } = await admin
    .from("client_plans")
    .select("id, ciclo_dias, valor_mensal, business_id")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return NextResponse.json({ ok: true });

  const accessToken = await getValidAccessToken(admin, plan.business_id);
  if (!accessToken) return new NextResponse("No Mercado Pago connection", { status: 409 });

  const preapproval = await getPreapproval(accessToken, preapprovalId).catch(() => null);
  if (!preapproval) return new NextResponse("Preapproval lookup failed", { status: 400 });

  await admin
    .from("client_plan_subs")
    .update({ mp_preapproval_status: preapproval.status })
    .eq("id", sub.id);

  if (preapproval.status === "cancelled" || preapproval.status === "paused") {
    await admin.from("client_plan_subs").update({ pagamento_status: "cancelado" }).eq("id", sub.id);
    return NextResponse.json({ ok: true });
  }

  if (preapproval.status !== "authorized") {
    return NextResponse.json({ ok: true });
  }

  const { count: pagosAntes } = await admin
    .from("client_plan_payments")
    .select("id", { count: "exact", head: true })
    .eq("plan_sub_id", sub.id)
    .eq("status", "pago");

  const chargedQuantity = preapproval.chargedQuantity ?? 0;
  if (chargedQuantity <= (pagosAntes ?? 0)) {
    return NextResponse.json({ ok: true });
  }

  const cicloReferencia = sub.data_renovacao;
  const eraPendente = sub.pagamento_status === "pendente";

  await admin.from("client_plan_payments").upsert(
    {
      plan_sub_id: sub.id,
      business_id: plan.business_id,
      ciclo_referencia: cicloReferencia,
      valor: plan.valor_mensal,
      forma_pagamento: "cartao",
      status: "pago",
      mp_preapproval_id: preapprovalId,
      pago_em: new Date().toISOString(),
    },
    { onConflict: "plan_sub_id,ciclo_referencia" },
  );

  await admin
    .from("client_plan_subs")
    .update({
      ativo: true,
      pagamento_status: "ativo",
      data_renovacao: formatISO(addDays(new Date(cicloReferencia), plan.ciclo_dias), {
        representation: "date",
      }),
      creditos_usados: {},
    })
    .eq("id", sub.id);

  if (eraPendente) {
    const { data: business } = await admin
      .from("businesses")
      .select("profile_id")
      .eq("id", plan.business_id)
      .maybeSingle();
    if (business) {
      try {
        await notifyProfessional(admin, {
          profileId: business.profile_id,
          tipo: "plano_pago",
          titulo: "Plano assinado",
          corpo: "Um cliente confirmou a assinatura do plano com cartão.",
          url: "/app/clientes",
        });
      } catch {
        // não bloqueia a confirmação do pagamento
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// Assinatura da própria Beloo (o profissional pagando a plataforma) — mesmo
// preapproval do Mercado Pago acima, mas cobrado com o access token fixo do
// dono, não com o token OAuth de uma conta conectada. Chega neste branch
// quando o preapproval não é de nenhum client_plan_sub.
async function handleSaasPreapprovalNotification(admin: Admin, preapprovalId: string) {
  const { data: sub } = await admin
    .from("saas_subscriptions")
    .select("id, business_id, status, charged_quantity_processed")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ ok: true });

  const preapproval = await getPreapproval(platformAccessToken(), preapprovalId).catch(() => null);
  if (!preapproval) return new NextResponse("Preapproval lookup failed", { status: 400 });

  await admin
    .from("saas_subscriptions")
    .update({ mp_preapproval_status: preapproval.status })
    .eq("id", sub.id);

  if (preapproval.status === "cancelled" || preapproval.status === "paused") {
    // Atômico: só quem realmente tirar o status de "cancelado" é quem
    // dispara o evento — webhooks duplicados (reentrega do MP) para a mesma
    // mudança de status caem no `.neq` e não batem nenhuma linha na segunda
    // vez, então não disparam CancelSubscription de novo.
    const { data: updated } = await admin
      .from("saas_subscriptions")
      .update({ status: "cancelado" })
      .eq("id", sub.id)
      .neq("status", "cancelado")
      .select("id");
    if ((updated?.length ?? 0) > 0) {
      const userData = await getMetaUserDataForBusiness(admin, sub.business_id);
      await sendCancelSubscriptionEvent({
        businessId: sub.business_id,
        eventId: randomUUID(),
        userData,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (preapproval.status !== "authorized") {
    return NextResponse.json({ ok: true });
  }

  const chargedQuantity = preapproval.chargedQuantity ?? 0;
  if (chargedQuantity <= sub.charged_quantity_processed) {
    return NextResponse.json({ ok: true });
  }

  // Atômico: a leitura de `sub` acima pode estar desatualizada se duas
  // entregas do mesmo webhook chegarem quase juntas (retry do MP por
  // timeout, por exemplo) — o `.lt` reavalia charged_quantity_processed no
  // banco na hora do UPDATE, então só uma das duas corridas realmente
  // aplica a mudança (a outra recebe 0 linhas afetadas). Só quem "ganha"
  // essa corrida decide se dispara Subscribe, evitando o evento duplicado.
  const { data: updated } = await admin
    .from("saas_subscriptions")
    .update({
      status: "ativo",
      current_period_end: addMonths(new Date(), 1).toISOString(),
      charged_quantity_processed: chargedQuantity,
    })
    .eq("id", sub.id)
    .lt("charged_quantity_processed", chargedQuantity)
    .select("id");

  // sub.status ainda reflete o valor de antes desse UPDATE (lido no começo
  // da função) — "era trial" é exatamente a condição de "essa é a primeira
  // cobrança confirmada", não uma renovação.
  if ((updated?.length ?? 0) > 0 && sub.status === "trial") {
    const userData = await getMetaUserDataForBusiness(admin, sub.business_id);
    await sendSubscribeEvent({
      businessId: sub.business_id,
      eventId: randomUUID(),
      value: preapproval.transactionAmount ?? 0,
      userData,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataId = searchParams.get("data.id") ?? searchParams.get("id");

  if (!dataId) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const verified = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!verified) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const appointmentId = searchParams.get("appointment");
  if (appointmentId) {
    return handleAppointmentDeposit(admin, appointmentId, dataId);
  }

  const saldoAppointmentId = searchParams.get("saldo");
  if (saldoAppointmentId) {
    return handleAppointmentAdvancePayment(admin, saldoAppointmentId, dataId);
  }

  const planSubId = searchParams.get("planSub");
  if (planSubId) {
    return handlePlanCyclePix(admin, planSubId, searchParams.get("ciclo"), dataId);
  }

  // Sem query string reconhecida: só pode ser notificação de mudança de
  // status de uma assinatura recorrente (preapproval), onde dataId É o
  // próprio id do preapproval.
  return handlePreapprovalNotification(admin, dataId);
}
