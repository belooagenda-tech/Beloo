"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { createPreapproval, createPreference } from "@/lib/mercadopago/client";

type SubscribeResult = { ok: true; url: string } | { ok: false; error: string };

async function loadPendingSub(subId: string, slug: string) {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("client_plan_subs")
    .select("id, plan_id, data_renovacao, pagamento_status, pagamento_expira_em")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Assinatura não encontrada." } as const;

  if (sub.pagamento_status !== "pendente") {
    return { ok: false, error: "Esse link já foi usado ou não está mais disponível." } as const;
  }
  if (sub.pagamento_expira_em && new Date(sub.pagamento_expira_em).getTime() < Date.now()) {
    return { ok: false, error: "Esse link expirou. Peça um novo link ao profissional." } as const;
  }

  const { data: plan } = await supabase
    .from("client_plans")
    .select("id, nome, valor_mensal, ciclo_dias, business_id")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plano não encontrado." } as const;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, nome_loja")
    .eq("id", plan.business_id)
    .maybeSingle();
  if (!business || business.slug !== slug) {
    return { ok: false, error: "Loja não encontrada." } as const;
  }

  return { ok: true, supabase, sub, plan, business } as const;
}

export async function subscribeToPlanWithCardAction(
  slug: string,
  subId: string,
  email: string,
): Promise<SubscribeResult> {
  if (!email.includes("@")) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const loaded = await loadPendingSub(subId, slug);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { supabase, sub, plan, business } = loaded;

  const accessToken = await getValidAccessToken(supabase, business.id);
  if (!accessToken) {
    return { ok: false, error: "Essa loja não está com o Mercado Pago conectado no momento." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const preapproval = await createPreapproval(accessToken, {
      reason: `Plano ${plan.nome} — ${business.nome_loja}`,
      externalReference: sub.id,
      payerEmail: email,
      amount: plan.valor_mensal,
      backUrl: `${siteUrl}/${slug}/planos/confirmacao?sub=${sub.id}`,
    });

    await supabase
      .from("client_plan_subs")
      .update({
        forma_cobranca: "cartao_recorrente",
        mp_preapproval_id: preapproval.id,
        mp_preapproval_status: preapproval.status,
      })
      .eq("id", sub.id);

    return { ok: true, url: preapproval.initPoint };
  } catch (err) {
    console.error("Beloo: falha ao criar assinatura recorrente Mercado Pago", err);
    return { ok: false, error: "Não foi possível iniciar a assinatura. Tente novamente." };
  }
}

export async function subscribeToPlanWithPixAction(
  slug: string,
  subId: string,
): Promise<SubscribeResult> {
  const loaded = await loadPendingSub(subId, slug);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { supabase, sub, plan, business } = loaded;

  const accessToken = await getValidAccessToken(supabase, business.id);
  if (!accessToken) {
    return { ok: false, error: "Essa loja não está com o Mercado Pago conectado no momento." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const preference = await createPreference(accessToken, {
      title: `Plano ${plan.nome} — ${business.nome_loja}`,
      amount: plan.valor_mensal,
      externalReference: `${sub.id}:${sub.data_renovacao}`,
      successUrl: `${siteUrl}/${slug}/planos/confirmacao?sub=${sub.id}`,
      failureUrl: `${siteUrl}/${slug}/planos/assinar/${sub.id}`,
      pendingUrl: `${siteUrl}/${slug}/planos/confirmacao?sub=${sub.id}`,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago?planSub=${sub.id}&ciclo=${sub.data_renovacao}`,
    });

    await supabase.from("client_plan_subs").update({ forma_cobranca: "pix_ciclico" }).eq("id", sub.id);

    await supabase.from("client_plan_payments").upsert(
      {
        plan_sub_id: sub.id,
        business_id: business.id,
        ciclo_referencia: sub.data_renovacao,
        valor: plan.valor_mensal,
        forma_pagamento: "pix",
        status: "pendente",
      },
      { onConflict: "plan_sub_id,ciclo_referencia" },
    );

    return { ok: true, url: preference.initPoint };
  } catch (err) {
    console.error("Beloo: falha ao criar cobrança Pix do plano", err);
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}
