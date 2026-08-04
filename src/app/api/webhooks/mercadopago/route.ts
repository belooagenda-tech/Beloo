import { NextResponse } from "next/server";
import { addDays, addMonths, formatISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook-signature";
import { getPayment, getPreapproval, platformAccessToken } from "@/lib/mercadopago/client";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { notifyProfessional } from "@/lib/push/notify";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Admin = SupabaseClient<Database>;

async function handleAppointmentDeposit(admin: Admin, appointmentId: string, dataId: string) {
  const { data: appointment } = await admin
    .from("appointments")
    .select("id, business_id, client_id, service_id, entrada_status")
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

  const payment = await getPayment(accessToken, dataId).catch(() => null);
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
    .select("id, status, charged_quantity_processed")
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
    await admin.from("saas_subscriptions").update({ status: "cancelado" }).eq("id", sub.id);
    return NextResponse.json({ ok: true });
  }

  if (preapproval.status !== "authorized") {
    return NextResponse.json({ ok: true });
  }

  const chargedQuantity = preapproval.chargedQuantity ?? 0;
  if (chargedQuantity <= sub.charged_quantity_processed) {
    return NextResponse.json({ ok: true });
  }

  await admin
    .from("saas_subscriptions")
    .update({
      status: "ativo",
      current_period_end: addMonths(new Date(), 1).toISOString(),
      charged_quantity_processed: chargedQuantity,
    })
    .eq("id", sub.id);

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

  const planSubId = searchParams.get("planSub");
  if (planSubId) {
    return handlePlanCyclePix(admin, planSubId, searchParams.get("ciclo"), dataId);
  }

  // Sem query string reconhecida: só pode ser notificação de mudança de
  // status de uma assinatura recorrente (preapproval), onde dataId É o
  // próprio id do preapproval.
  return handlePreapprovalNotification(admin, dataId);
}
