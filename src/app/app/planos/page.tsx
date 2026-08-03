import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlansManager } from "./plans-manager";

export const metadata: Metadata = { title: "Planos" };

export default async function PlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("profile_id", user!.id)
    .single();

  const admin = createAdminClient();
  const [{ data: services }, { data: plans }, { data: mpConnection }] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome")
      .eq("business_id", business!.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("client_plans")
      .select("id, nome, valor_mensal, servicos_inclusos, ciclo_dias, ativo, permite_pagamento_online")
      .eq("business_id", business!.id)
      .order("created_at", { ascending: true }),
    admin.from("mp_connections").select("business_id").eq("business_id", business!.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Planos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pacotes recorrentes que você vende para os seus clientes — não
          confunda com a sua assinatura da Beloo, que fica em Assinatura.
        </p>
      </div>

      <PlansManager
        businessId={business!.id}
        slug={business!.slug}
        services={services ?? []}
        initialPlans={plans ?? []}
        mpConnected={Boolean(mpConnection)}
      />
    </div>
  );
}
