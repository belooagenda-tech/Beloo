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
