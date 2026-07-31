import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { WeeklyHoursCard } from "./weekly-hours-card";
import { GeneralSettingsCard } from "./general-settings-card";
import { ExceptionsCard } from "./exceptions-card";

export const metadata: Metadata = { title: "Disponibilidade" };

export default async function DisponibilidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, antecedencia_minima_min, limite_dias_futuro, buffer_padrao_min")
    .eq("profile_id", user!.id)
    .single();

  const [{ data: hours }, { data: exceptions }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("dia_semana, hora_inicio, hora_fim")
      .eq("business_id", business!.id),
    supabase
      .from("business_exceptions")
      .select("id, data, tipo, hora_inicio, hora_fim")
      .eq("business_id", business!.id)
      .order("data", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Disponibilidade
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina quando você atende e como seus clientes agendam.
        </p>
      </div>

      <WeeklyHoursCard businessId={business!.id} initialHours={hours ?? []} />

      <GeneralSettingsCard
        businessId={business!.id}
        initialAntecedencia={business!.antecedencia_minima_min}
        initialLimiteDias={business!.limite_dias_futuro}
        initialBufferPadrao={business!.buffer_padrao_min}
      />

      <ExceptionsCard businessId={business!.id} initialExceptions={exceptions ?? []} />
    </div>
  );
}
