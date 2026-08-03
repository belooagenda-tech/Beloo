"use server";

import { addDays, addMinutes, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/mercadopago/connection";
import { updatePreapprovalStatus } from "@/lib/mercadopago/client";
import { PLANO_ASSINATURA_EXPIRACAO_MINUTOS } from "@/lib/constants";

async function getOwnBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  return business?.id ?? null;
}

export type CreatePlanSubRequestResult = { ok: true; subId: string } | { ok: false; error: string };

export async function createPlanSubRequestAction(
  clientId: string,
  planId: string,
): Promise<CreatePlanSubRequestResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("client_plans")
    .select("id, ciclo_dias, permite_pagamento_online")
    .eq("id", planId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!plan || !plan.permite_pagamento_online) {
    return { ok: false, error: "Esse plano não está disponível para pagamento online." };
  }

  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!client) {
    return { ok: false, error: "Cliente não encontrado." };
  }

  const { data: connection } = await admin
    .from("mp_connections")
    .select("business_id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!connection) {
    return { ok: false, error: "Conecte sua conta do Mercado Pago antes de gerar o link." };
  }

  const hoje = new Date();
  const { data: sub, error } = await admin
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
          ? "Esse cliente já tem um plano ativo."
          : "Não foi possível gerar o link. Tente novamente.",
    };
  }

  return { ok: true, subId: sub.id };
}

export type CancelPlanSubResult = { ok: true; aviso?: string } | { ok: false; error: string };

export async function cancelPlanSubAction(subId: string): Promise<CancelPlanSubResult> {
  const businessId = await getOwnBusinessId();
  if (!businessId) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("client_plan_subs")
    .select("id, client_id, forma_cobranca, mp_preapproval_id")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) {
    return { ok: false, error: "Assinatura não encontrada." };
  }

  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("id", sub.client_id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!client) {
    return { ok: false, error: "Assinatura não encontrada." };
  }

  let aviso: string | undefined;
  if (sub.forma_cobranca === "cartao_recorrente" && sub.mp_preapproval_id) {
    try {
      const accessToken = await getValidAccessToken(admin, businessId);
      if (!accessToken) throw new Error("sem conexão Mercado Pago");
      await updatePreapprovalStatus(accessToken, sub.mp_preapproval_id, "cancelled");
    } catch (err) {
      console.error("Beloo: falha ao cancelar assinatura recorrente no Mercado Pago", err);
      aviso =
        "O plano foi cancelado por aqui, mas a cobrança automática no Mercado Pago pode não ter sido cancelada — verifique manualmente.";
    }
  }

  const { error } = await admin
    .from("client_plan_subs")
    .update({
      ativo: false,
      pagamento_status: sub.forma_cobranca === "manual" ? undefined : "cancelado",
    })
    .eq("id", subId);

  if (error) {
    return { ok: false, error: "Não foi possível cancelar o plano." };
  }

  return { ok: true, aviso };
}
