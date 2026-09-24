import type { PlanTier } from "@/lib/supabase/types";

// Matriz estática de quais tiers liberam cada feature — fonte de verdade em
// código (não no banco, já que o conjunto de features por plano não é algo
// que o admin edita, só os preços — ver supabase/migrations/20260923000002_plan_tiers.sql
// e src/app/app/admin/plan-prices-card.tsx).
export type PlanFeature =
  | "lembretes_automaticos"
  | "reengajamento"
  | "lista_espera"
  | "pix_automatico"
  | "planos_recorrentes"
  | "relatorios_financeiros"
  | "qr_code"
  | "avaliacoes"
  | "multi_profissional";

const PLAN_FEATURES: Record<PlanFeature, PlanTier[]> = {
  lembretes_automaticos: ["pro", "studio"],
  reengajamento: ["pro", "studio"],
  lista_espera: ["pro", "studio"],
  pix_automatico: ["pro", "studio"],
  planos_recorrentes: ["pro", "studio"],
  relatorios_financeiros: ["pro", "studio"],
  qr_code: ["pro", "studio"],
  avaliacoes: ["pro", "studio"],
  multi_profissional: ["studio"],
};

export function hasFeature(planTier: PlanTier, feature: PlanFeature): boolean {
  return PLAN_FEATURES[feature].includes(planTier);
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  gratis: "Grátis",
  pro: "Pro",
  studio: "Studio",
};

// Tier mínimo exigido por feature — usado pra mensagem "Disponível no plano
// X" (ver pro-feature-gate.tsx). Sempre o menor tier que já libera.
export function minPlanFor(feature: PlanFeature): PlanTier {
  return PLAN_FEATURES[feature][0];
}
