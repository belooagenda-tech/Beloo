import { NextResponse } from "next/server";
import { addDays, formatISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { createPreference } from "@/lib/mercadopago/client";
import { sendPushToClient } from "@/lib/push/send-push";
import { PLANO_PIX_LEMBRETE_DIAS_ANTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const hoje = new Date();
  const janela = formatISO(addDays(hoje, PLANO_PIX_LEMBRETE_DIAS_ANTES), { representation: "date" });

  const { data: subs } = await admin
    .from("client_plan_subs")
    .select("id, client_id, plan_id, data_renovacao")
    .eq("forma_cobranca", "pix_ciclico")
    .eq("ativo", true)
    .lte("data_renovacao", janela);

  let linksGerados = 0;
  let marcadosAtrasado = 0;

  for (const sub of subs ?? []) {
    const { data: paymentRow } = await admin
      .from("client_plan_payments")
      .select("id, status")
      .eq("plan_sub_id", sub.id)
      .eq("ciclo_referencia", sub.data_renovacao)
      .maybeSingle();

    const venceu = new Date(sub.data_renovacao).getTime() < hoje.getTime();

    if (paymentRow) {
      if (venceu && paymentRow.status === "pendente") {
        await admin.from("client_plan_subs").update({ pagamento_status: "atrasado" }).eq("id", sub.id);
        marcadosAtrasado++;
      }
      continue;
    }

    const { data: plan } = await admin
      .from("client_plans")
      .select("id, nome, valor_mensal, business_id")
      .eq("id", sub.plan_id)
      .maybeSingle();
    if (!plan) continue;

    const { data: business } = await admin
      .from("businesses")
      .select("slug, nome_loja")
      .eq("id", plan.business_id)
      .maybeSingle();
    if (!business) continue;

    const accessToken = await getValidAccessToken(admin, plan.business_id);
    if (!accessToken) continue;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    try {
      const preference = await createPreference(accessToken, {
        title: `Plano ${plan.nome} — ${business.nome_loja}`,
        amount: plan.valor_mensal,
        externalReference: `${sub.id}:${sub.data_renovacao}`,
        successUrl: `${siteUrl}/${business.slug}/planos/confirmacao?sub=${sub.id}`,
        failureUrl: `${siteUrl}/${business.slug}`,
        pendingUrl: `${siteUrl}/${business.slug}/planos/confirmacao?sub=${sub.id}`,
        notificationUrl: `${siteUrl}/api/webhooks/mercadopago?planSub=${sub.id}&ciclo=${sub.data_renovacao}`,
      });

      await admin.from("client_plan_payments").insert({
        plan_sub_id: sub.id,
        business_id: plan.business_id,
        ciclo_referencia: sub.data_renovacao,
        valor: plan.valor_mensal,
        forma_pagamento: "pix",
        status: "pendente",
      });

      try {
        await sendPushToClient(admin, sub.client_id, {
          title: "Renovação do seu plano",
          body: `Toque para renovar o plano ${plan.nome} e continuar com os créditos ativos.`,
          url: preference.initPoint,
          tag: "renovacao_plano",
        });
      } catch {
        // renovação já foi criada; falha no push não deve travar o cron
      }

      linksGerados++;
    } catch (err) {
      console.error("Beloo: falha ao gerar cobrança Pix de renovação de plano", err);
    }

    if (venceu) {
      await admin.from("client_plan_subs").update({ pagamento_status: "atrasado" }).eq("id", sub.id);
      marcadosAtrasado++;
    }
  }

  return NextResponse.json({ ok: true, linksGerados, marcadosAtrasado });
}
