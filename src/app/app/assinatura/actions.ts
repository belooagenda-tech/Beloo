"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPreapproval, platformAccessToken, updatePreapprovalStatus } from "@/lib/mercadopago/client";
import { getMetaUserDataForBusiness, sendCancelSubscriptionEvent } from "@/lib/meta-ads/capi";

type ActionResult = { ok: true; initPoint: string } | { ok: false; error: string };

async function getOwnBusinessAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase.from("businesses").select("id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("email, nome").eq("id", user.id).maybeSingle(),
  ]);
  if (!business || !profile) return null;
  return { businessId: business.id, email: profile.email, nome: profile.nome };
}

export async function subscribeToSaasBillingAction(): Promise<ActionResult> {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  let preapproval;
  try {
    preapproval = await createPreapproval(platformAccessToken(), {
      reason: "Assinatura Beloo",
      externalReference: own.businessId,
      payerEmail: own.email,
      amount: plan.valor_mensal,
      backUrl: `${siteUrl}/app/assinatura`,
    });
  } catch (err) {
    console.error("Beloo: falha ao criar assinatura da plataforma", err);
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }

  await admin
    .from("saas_subscriptions")
    .update({
      mp_preapproval_id: preapproval.id,
      mp_preapproval_status: preapproval.status,
    })
    .eq("business_id", own.businessId);

  return { ok: true, initPoint: preapproval.initPoint };
}

export type CancelResult = { ok: true; aviso?: string } | { ok: false; error: string };

export async function cancelSaasSubscriptionAction(): Promise<CancelResult> {
  const own = await getOwnBusinessAndProfile();
  if (!own) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("saas_subscriptions")
    .select("mp_preapproval_id")
    .eq("business_id", own.businessId)
    .maybeSingle();
  if (!sub) {
    return { ok: false, error: "Assinatura não encontrada." };
  }

  let aviso: string | undefined;
  if (sub.mp_preapproval_id) {
    try {
      await updatePreapprovalStatus(platformAccessToken(), sub.mp_preapproval_id, "cancelled");
    } catch (err) {
      console.error("Beloo: falha ao cancelar assinatura da plataforma no Mercado Pago", err);
      aviso =
        "A assinatura foi cancelada por aqui, mas a cobrança automática no Mercado Pago pode não ter sido cancelada — verifique manualmente.";
    }
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

  return { ok: true, aviso };
}
