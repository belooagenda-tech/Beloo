"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

export async function toggleBillingAction(input: {
  enabled: boolean;
  valorMensal: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }
  if (input.valorMensal <= 0) {
    return { ok: false, error: "Informe um preço válido." };
  }

  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from("saas_plans")
    .select("id, billing_enabled, trial_dias")
    .limit(1)
    .maybeSingle();
  if (!current) {
    return { ok: false, error: "Configuração de cobrança não encontrada." };
  }

  const ligandoAgora = input.enabled && !current.billing_enabled;

  const { error } = await supabase
    .from("saas_plans")
    .update({
      billing_enabled: input.enabled,
      valor_mensal: input.valorMensal,
      ...(ligandoAgora ? { billing_enabled_at: new Date().toISOString() } : {}),
    })
    .eq("id", current.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Dá 7 dias grátis (a partir de agora) para quem ainda está em trial — é
  // assim que quem já usa a Beloo hoje ganha tempo pra pagar antes de ser
  // bloqueado.
  if (ligandoAgora) {
    await supabase
      .from("saas_subscriptions")
      .update({
        trial_ends_at: new Date(Date.now() + current.trial_dias * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("status", "trial");
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
