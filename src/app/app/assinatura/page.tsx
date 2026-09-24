import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { PlanPicker } from "./plan-picker";

export const metadata: Metadata = { title: "Assinatura" };

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const [{ data: plan }, { data: sub }] = await Promise.all([
    supabase.from("saas_plans").select("valor_mensal_pro, valor_mensal_studio").limit(1).maybeSingle(),
    supabase.from("saas_subscriptions").select("status").eq("business_id", business!.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o plano que faz mais sentido pra sua loja.
        </p>
      </div>

      <PlanPicker
        currentTier={business!.plan_tier}
        valorPro={plan?.valor_mensal_pro ?? 49.9}
        valorStudio={plan?.valor_mensal_studio ?? 89.9}
        temAssinaturaAtiva={sub?.status === "ativo"}
      />
    </div>
  );
}
