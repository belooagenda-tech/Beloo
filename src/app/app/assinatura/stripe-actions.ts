"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSaasCheckoutSession, cancelStripeSubscription } from "@/lib/stripe/client";
import { getMetaUserDataForBusiness, sendCancelSubscriptionEvent } from "@/lib/meta-ads/capi";

type ActionResult = { ok: true; url: string } | { ok: false; error: string };

async function getOwnBusinessAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase.from("businesses").select("id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("email").eq("id", user.id).maybeSingle(),
  ]);
  if (!business || !profile) return null;
  return { businessId: business.id, email: profile.email };
}

// Assinatura Beloo cobrada via Stripe — usada por profissionais que ainda
// não têm nenhuma assinatura no Mercado Pago (ver branch em page.tsx). Se
// houver uma indicação vinculada com divulgador de onboarding Stripe
// completo, a cobrança já nasce dividida (transfer_data + application_fee).
export async function subscribeToSaasBillingStripeAction(): Promise<ActionResult> {
  const own = await getOwnBusinessAndProfile();
  if (!own) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }
  if (!own.email) {
    return { ok: false, error: "Cadastre um e-mail no seu perfil antes de assinar." };
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("saas_plans")
    .select("billing_enabled, valor_mensal")
    .limit(1)
    .maybeSingle();
  if (!plan || !plan.billing_enabled) {
    return { ok: false, error: "A cobrança ainda não está ativa." };
  }

  const { data: indicacao } = await admin
    .from("indicacoes")
    .select("divulgador_id")
    .eq("profissional_id", own.businessId)
    .maybeSingle();

  let split: { destinationAccountId: string; applicationFeePercent: number } | undefined;
  if (indicacao) {
    const { data: divulgador } = await admin
      .from("divulgadores")
      .select("stripe_account_id, stripe_onboarding_completo, percentual_comissao, status")
      .eq("id", indicacao.divulgador_id)
      .maybeSingle();
    if (
      divulgador?.status === "ativo" &&
      divulgador.stripe_onboarding_completo &&
      divulgador.stripe_account_id
    ) {
      split = {
        destinationAccountId: divulgador.stripe_account_id,
        applicationFeePercent: Math.max(0, 100 - divulgador.percentual_comissao),
      };
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const { url } = await createSaasCheckoutSession({
      businessId: own.businessId,
      email: own.email,
      valorMensal: plan.valor_mensal,
      successUrl: `${siteUrl}/app/assinatura?stripe=sucesso`,
      cancelUrl: `${siteUrl}/app/assinatura`,
      split,
    });
    return { ok: true, url };
  } catch (err) {
    console.error("Beloo: falha ao criar checkout Stripe da assinatura", err);
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}

export type CancelStripeResult = { ok: true } | { ok: false; error: string };

export async function cancelSaasSubscriptionStripeAction(): Promise<CancelStripeResult> {
  const own = await getOwnBusinessAndProfile();
  if (!own) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  const { data: assinatura } = await admin
    .from("assinaturas_stripe")
    .select("stripe_subscription_id")
    .eq("profissional_id", own.businessId)
    .maybeSingle();
  if (!assinatura) {
    return { ok: false, error: "Assinatura não encontrada." };
  }

  try {
    await cancelStripeSubscription(assinatura.stripe_subscription_id);
  } catch (err) {
    console.error("Beloo: falha ao cancelar assinatura Stripe", err);
    return { ok: false, error: "Não foi possível cancelar agora. Tente novamente." };
  }

  // Atômico: só dispara CancelSubscription se essa chamada realmente tirou
  // o status de "cancelado" (evita duplo evento em duplo clique no botão).
  const { data: updated } = await admin
    .from("saas_subscriptions")
    .update({ status: "cancelado" })
    .eq("business_id", own.businessId)
    .neq("status", "cancelado")
    .select("id");

  if ((updated?.length ?? 0) > 0) {
    const userData = await getMetaUserDataForBusiness(admin, own.businessId);
    await sendCancelSubscriptionEvent({ businessId: own.businessId, eventId: randomUUID(), userData });
  }

  return { ok: true };
}
