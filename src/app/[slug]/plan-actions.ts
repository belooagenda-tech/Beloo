"use server";

import { addDays, addMinutes, formatISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { createPreapproval, createPreference } from "@/lib/mercadopago/client";
import { normalizePhone } from "@/lib/phone";
import { clientInfoSchema } from "@/lib/validations/public-booking";
import { PLANO_ASSINATURA_EXPIRACAO_MINUTOS } from "@/lib/constants";

type SubscribeResult = { ok: true; url: string } | { ok: false; error: string };

export type RequestPlanSubscriptionResult =
  | { ok: true; subId: string }
  | { ok: false; error: string };

// Self-service: o cliente escolhe o plano direto no link público, sem o
// profissional precisar atribuir manualmente. Só funciona pra planos com
// pagamento online habilitado — o resto do fluxo (escolher cartão/Pix e
// pagar) reaproveita a página /planos/assinar/[subId] já existente, que era
// usada só pelo link individual gerado dentro do app.
export async function requestPlanSubscriptionAction(
  slug: string,
  planId: string,
  nome: string,
  telefone: string,
  empresa?: string,
): Promise<RequestPlanSubscriptionResult> {
  // Campo-armadilha preenchido = formulário automatizado.
  if (empresa) {
    return { ok: false, error: "Não foi possível iniciar a assinatura. Tente novamente." };
  }

  const parsed = clientInfoSchema.safeParse({ nome, telefone });
  if (!parsed.success) {
    return { ok: false, error: "Confira seu nome e WhatsApp e tente novamente." };
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: plan } = await supabase
    .from("client_plans")
    .select("id, ciclo_dias, ativo, permite_pagamento_online")
    .eq("id", planId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!plan || !plan.ativo || !plan.permite_pagamento_online) {
    return { ok: false, error: "Esse plano não está mais disponível." };
  }

  const { data: connection } = await supabase
    .from("mp_connections")
    .select("business_id")
    .eq("business_id", business.id)
    .maybeSingle();
  if (!connection) {
    return { ok: false, error: "Essa loja não está com pagamento online disponível no momento." };
  }

  const telefoneNormalizado = normalizePhone(parsed.data.telefone);
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", business.id)
    .eq("telefone", telefoneNormalizado)
    .maybeSingle();

  let clientId = existingClient?.id;
  if (!clientId) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ business_id: business.id, nome: parsed.data.nome, telefone: telefoneNormalizado })
      .select("id")
      .single();
    if (clientError || !newClient) {
      return { ok: false, error: "Não foi possível salvar seus dados. Tente novamente." };
    }
    clientId = newClient.id;
  }

  const { data: activeSub } = await supabase
    .from("client_plan_subs")
    .select("id")
    .eq("client_id", clientId)
    .eq("ativo", true)
    .maybeSingle();
  if (activeSub) {
    return {
      ok: false,
      error: "Você já tem um plano ativo com essa loja. Fale direto com o profissional para trocar de plano.",
    };
  }

  const hoje = new Date();
  const { data: sub, error } = await supabase
    .from("client_plan_subs")
    .insert({
      client_id: clientId,
      plan_id: planId,
      data_inicio: formatISO(hoje, { representation: "date" }),
      // Placeholder até o pagamento confirmar — o webhook reescreve essa
      // data pro ciclo de verdade assim que a assinatura vira ativa.
      data_renovacao: formatISO(addDays(hoje, plan.ciclo_dias), { representation: "date" }),
      creditos_usados: {},
      ativo: false,
      pagamento_status: "pendente",
      pagamento_expira_em: addMinutes(hoje, PLANO_ASSINATURA_EXPIRACAO_MINUTOS).toISOString(),
    })
    .select("id")
    .single();

  if (error || !sub) {
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "Você já tem um plano ativo com essa loja."
          : "Não foi possível iniciar a assinatura. Tente novamente.",
    };
  }

  return { ok: true, subId: sub.id };
}

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
