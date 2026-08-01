import type { Metadata } from "next";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { AgendaDayView } from "./agenda-day-view";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone, buffer_padrao_min")
    .eq("profile_id", user!.id)
    .single();

  const { data: dataParam } = await searchParams;
  const hojeStr = formatInTimeZone(new Date(), business!.timezone, "yyyy-MM-dd");
  const dataSelecionada = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : hojeStr;

  const dayStart = fromZonedTime(`${dataSelecionada}T00:00:00`, business!.timezone);
  const dayEnd = addDays(dayStart, 1);

  const [{ data: services }, { data: appointments }] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome, duracao_min, preco, buffer_min, cor, ativo")
      .eq("business_id", business!.id)
      .order("nome", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, client_id, service_id, inicio, fim, status, observacoes")
      .eq("business_id", business!.id)
      .gte("inicio", dayStart.toISOString())
      .lt("inicio", dayEnd.toISOString())
      .order("inicio", { ascending: true }),
  ]);

  const clientIds = [...new Set((appointments ?? []).map((a) => a.client_id))];
  const appointmentIds = (appointments ?? []).map((a) => a.id);

  const [{ data: clients }, { data: payments }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, nome, telefone").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    appointmentIds.length > 0
      ? supabase
          .from("appointment_payments")
          .select("id, appointment_id, valor, forma_pagamento, origem")
          .in("appointment_id", appointmentIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AgendaDayView
      businessId={business!.id}
      timezone={business!.timezone}
      bufferPadrao={business!.buffer_padrao_min}
      dataSelecionada={dataSelecionada}
      hojeStr={hojeStr}
      services={services ?? []}
      appointments={appointments ?? []}
      clients={clients ?? []}
      payments={payments ?? []}
    />
  );
}
