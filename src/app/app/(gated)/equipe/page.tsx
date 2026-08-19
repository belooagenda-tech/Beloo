import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { SelectionModeCard } from "./selection-mode-card";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const [{ data: professionals }, { data: services }] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, business_id, nome, foto_url, cor, ativo, usa_horario_proprio, ordem, created_at")
      .eq("business_id", business!.id)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("services")
      .select("id, nome, ativo")
      .eq("business_id", business!.id)
      .order("nome", { ascending: true }),
  ]);

  const professionalIds = (professionals ?? []).map((p) => p.id);
  const { data: professionalServices } =
    professionalIds.length > 0
      ? await supabase
          .from("professional_services")
          .select("professional_id, service_id")
          .in("professional_id", professionalIds)
      : { data: [] };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Equipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre os profissionais que atendem na sua loja, o que cada um faz e, se
          precisar, os horários próprios de cada um.
        </p>
      </div>

      <SelectionModeCard businessId={business!.id} initialModo={business!.modo_selecao_profissional} />

      <TeamManager
        businessId={business!.id}
        services={services ?? []}
        initialProfessionals={professionals ?? []}
        initialProfessionalServices={professionalServices ?? []}
      />
    </div>
  );
}
