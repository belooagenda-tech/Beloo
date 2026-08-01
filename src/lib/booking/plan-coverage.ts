import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type PlanCoverage =
  | { covered: true; usados: number; limite: number | null }
  | { covered: false; motivo: "sem_plano" | "nao_cobre" | "sem_creditos" | null };

export async function checkPlanCoverage(
  supabase: SupabaseClient<Database>,
  clientId: string,
  serviceId: string,
): Promise<PlanCoverage> {
  const { data: sub } = await supabase
    .from("client_plan_subs")
    .select("id, plan_id, creditos_usados")
    .eq("client_id", clientId)
    .eq("ativo", true)
    .maybeSingle();

  if (!sub) return { covered: false, motivo: "sem_plano" };

  const { data: plan } = await supabase
    .from("client_plans")
    .select("servicos_inclusos")
    .eq("id", sub.plan_id)
    .maybeSingle();

  const entry = plan?.servicos_inclusos.find((item) => item.service_id === serviceId);
  if (!entry) return { covered: false, motivo: "nao_cobre" };

  const usados = sub.creditos_usados[serviceId] ?? 0;
  if (entry.quantidade !== null && usados >= entry.quantidade) {
    return { covered: false, motivo: "sem_creditos" };
  }

  return { covered: true, usados, limite: entry.quantidade };
}
