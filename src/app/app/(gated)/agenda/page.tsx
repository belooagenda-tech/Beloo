import type { Metadata } from "next";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { AgendaDayView } from "./agenda-day-view";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const supabase = await createClient();
  const business = await getOwnBusiness();

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
      .select(
        "id, client_id, service_id, inicio, fim, status, observacoes, entrada_status, entrada_valor",
      )
      .eq("business_id", business!.id)
      .gte("inicio", dayStart.toISOString())
      .lt("inicio", dayEnd.toISOString())
      .order("inicio", { ascending: true }),
  ]);

  const clientIds = [...new Set((appointments ?? []).map((a) => a.client_id))];
  const appointmentIds = (appointments ?? []).map((a) => a.id);

  const [{ data: clients }, { data: payments }, { data: activeSubs }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, nome, telefone").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    appointmentIds.length > 0
      ? supabase
          .from("appointment_payments")
          .select("id, appointment_id, valor, forma_pagamento, origem, entrada_valor")
          .in("appointment_id", appointmentIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supabase
          .from("client_plan_subs")
          .select("client_id, plan_id, creditos_usados")
          .eq("ativo", true)
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Plano ativo de cada cliente que apareceu na Agenda hoje — igual ao
  // padrão do resto da página, monta um mapa em memória em vez de 1 query
  // por cliente dentro do componente.
  const planIds = [...new Set((activeSubs ?? []).map((s) => s.plan_id))];
  const { data: plans } =
    planIds.length > 0
      ? await supabase.from("client_plans").select("id, nome, servicos_inclusos").in("id", planIds)
      : { data: [] };
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  const clientPlans = (activeSubs ?? []).flatMap((sub) => {
    const plan = planById.get(sub.plan_id);
    if (!plan) return [];
    return [
      {
        clientId: sub.client_id,
        planoNome: plan.nome,
        creditosUsados: sub.creditos_usados,
        servicosInclusos: plan.servicos_inclusos,
      },
    ];
  });

  return (
    <AgendaDayView
      key={dataSelecionada}
      businessId={business!.id}
      timezone={business!.timezone}
      bufferPadrao={business!.buffer_padrao_min}
      dataSelecionada={dataSelecionada}
      hojeStr={hojeStr}
      services={services ?? []}
      appointments={appointments ?? []}
      clients={clients ?? []}
      payments={payments ?? []}
      clientPlans={clientPlans}
    />
  );
}
