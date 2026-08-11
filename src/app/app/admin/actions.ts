"use server";

import { fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) return null;
  return profile;
}

// Mesmo fuso usado no relatório de comissões do Admin (ver page.tsx) — as
// datas escolhidas aqui são só "dia", então fecham às 23:59:59 desse fuso
// pra "até dia X" incluir o dia X inteiro.
const ADMIN_TIMEZONE = "America/Sao_Paulo";

function endOfDayInAdminTz(dateStr: string): string {
  return fromZonedTime(`${dateStr}T23:59:59`, ADMIN_TIMEZONE).toISOString();
}

// Controle manual do vencimento de um profissional pelo Admin — prolongar um
// trial, marcar como ativo com uma data de próxima cobrança combinada fora
// do fluxo normal do Mercado Pago, etc. O sistema (bloqueio de acesso em
// app/(gated)/layout.tsx) lê status/trial_ends_at/current_period_end direto
// dessa tabela, então qualquer alteração aqui já vale na hora.
export async function updateSubscriptionAction(input: {
  businessId: string;
  status: SaasSubscriptionStatus;
  trialEndsAt: string;
  currentPeriodEnd: string | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, error: "Sem permissão." };
  }
  if (!input.trialEndsAt) {
    return { ok: false, error: "Informe a data do trial." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("saas_subscriptions")
    .update({
      status: input.status,
      trial_ends_at: endOfDayInAdminTz(input.trialEndsAt),
      current_period_end: input.currentPeriodEnd ? endOfDayInAdminTz(input.currentPeriodEnd) : null,
    })
    .eq("business_id", input.businessId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
  return { ok: true };
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
