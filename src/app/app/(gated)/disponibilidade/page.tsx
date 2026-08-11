import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { WeeklyHoursCard } from "./weekly-hours-card";
import { GeneralSettingsCard } from "./general-settings-card";
import { ExceptionsCard } from "./exceptions-card";
import { RecurringBlocksCard } from "./recurring-blocks-card";

export const metadata: Metadata = { title: "Disponibilidade" };

export default async function DisponibilidadePage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const [{ data: hours }, { data: exceptions }, { data: recurringBlocks }] = await Promise.all([
    supabase
      .from("business_hours")
      .select("dia_semana, hora_inicio, hora_fim")
      .eq("business_id", business!.id),
    supabase
      .from("business_exceptions")
      .select("id, data, tipo, hora_inicio, hora_fim")
      .eq("business_id", business!.id)
      .order("data", { ascending: true }),
    supabase
      .from("recurring_blocks")
      .select("id, dia_semana, hora_inicio, hora_fim, motivo")
      .eq("business_id", business!.id)
      .order("dia_semana", { ascending: true }),
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
        initialCancelamentoMinHoras={business!.cancelamento_min_horas}
      />

      <RecurringBlocksCard businessId={business!.id} initialBlocks={recurringBlocks ?? []} />

      <ExceptionsCard businessId={business!.id} initialExceptions={exceptions ?? []} />
    </div>
  );
}
