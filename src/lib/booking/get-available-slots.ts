import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailableSlots, type BusyAppointment } from "./available-slots";

export async function getAvailableSlotsForService(businessId: string, serviceId: string) {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("timezone, antecedencia_minima_min, limite_dias_futuro, buffer_padrao_min")
    .eq("id", businessId)
    .single();

  if (!business) return null;

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min, buffer_min, ativo")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .single();

  if (!service || !service.ativo) return null;

  const bufferMin = service.buffer_min ?? business.buffer_padrao_min;

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + (business.limite_dias_futuro + 1) * 24 * 60 * 60_000);

  const [{ data: hours }, { data: exceptions }, { data: appointments }, { data: services }] =
    await Promise.all([
      supabase
        .from("business_hours")
        .select("dia_semana, hora_inicio, hora_fim")
        .eq("business_id", businessId),
      supabase
        .from("business_exceptions")
        .select("data, tipo, hora_inicio, hora_fim")
        .eq("business_id", businessId),
      supabase
        .from("appointments")
        .select("inicio, fim, service_id")
        .eq("business_id", businessId)
        .neq("status", "cancelado")
        .lt("inicio", horizonEnd.toISOString())
        .gt("fim", now.toISOString()),
      supabase.from("services").select("id, buffer_min").eq("business_id", businessId),
    ]);

  const bufferByService = new Map((services ?? []).map((s) => [s.id, s.buffer_min]));
  const busyAppointments: BusyAppointment[] = (appointments ?? []).map((row) => ({
    inicio: row.inicio,
    fim: row.fim,
    bufferMin: bufferByService.get(row.service_id) ?? business.buffer_padrao_min,
  }));

  return computeAvailableSlots({
    timezone: business.timezone,
    now,
    antecedenciaMinutos: business.antecedencia_minima_min,
    limiteDiasFuturo: business.limite_dias_futuro,
    duracaoMin: service.duracao_min,
    bufferMin,
    businessHours: hours ?? [],
    exceptions: exceptions ?? [],
    busyAppointments,
  });
}
