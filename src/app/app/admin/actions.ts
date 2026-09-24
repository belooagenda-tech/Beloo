"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import type { PlanTier } from "@/lib/supabase/types";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

// Ajuste manual do plano de um negócio pelo Admin — ex. comp de cortesia,
// suporte a um caso específico. Grava direto em businesses.plan_tier, a
// mesma coluna que o webhook do Stripe escreve quando alguém assina/cancela.
export async function updateBusinessPlanTierAction(input: {
  businessId: string;
  planTier: PlanTier;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("businesses")
    .update({ plan_tier: input.planTier })
    .eq("id", input.businessId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
}

export async function updatePlanPricesAction(input: {
  valorPro: number;
  valorStudio: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }
  if (input.valorPro <= 0 || input.valorStudio <= 0) {
    return { ok: false, error: "Informe preços válidos." };
  }

  const supabase = createAdminClient();

  const { data: current } = await supabase.from("saas_plans").select("id").limit(1).maybeSingle();
  if (!current) {
    return { ok: false, error: "Configuração de planos não encontrada." };
  }

  const { error } = await supabase
    .from("saas_plans")
    .update({ valor_mensal_pro: input.valorPro, valor_mensal_studio: input.valorStudio })
    .eq("id", current.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  return { ok: true };
}

// ============================================================================
// Divulgadores — sistema de comissões via Stripe Connect. Roda em paralelo
// à cobrança da Beloo acima; não interfere em nada do bloco anterior.
// ============================================================================

export async function updateDivulgadorComissaoAction(input: {
  divulgadorId: string;
  percentualComissao: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }
  if (input.percentualComissao < 0 || input.percentualComissao > 100) {
    return { ok: false, error: "O percentual precisa ficar entre 0 e 100." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("divulgadores")
    .update({ percentual_comissao: input.percentualComissao })
    .eq("id", input.divulgadorId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
}

export async function toggleDivulgadorStatusAction(input: {
  divulgadorId: string;
  status: "ativo" | "inativo";
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("divulgadores")
    .update({ status: input.status })
    .eq("id", input.divulgadorId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
}
