import type { Metadata } from "next";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { resolveDayBlocks } from "@/lib/agenda/day-window";
import { AgendaDayView } from "./agenda-day-view";
import type { AgendaAppointment, AgendaClient, AgendaPayment } from "./types";

export const metadata: Metadata = { title: "Agenda" };

// Formato bruto da query de appointments com cliente e pagamento embutidos
// via embed do PostgREST (relação N:1 nos dois casos — sempre um objeto
// único, nunca array; confirmado contra o schema real antes dessa mudança).
// Os tipos do Database (src/lib/supabase/types.ts) são mantidos à mão e não
// modelam relacionamentos, então o retorno do select precisa de um cast
// explícito em vez de inferência automática.
type AppointmentEmbedRow = AgendaAppointment & {
  clients: AgendaClient | null;
  appointment_payments: AgendaPayment | null;
};

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

  const [
    { data: services },
    { data: appointmentsRaw },
    { data: blocks },
    { data: businessHours },
    { data: dayExceptions },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, nome, duracao_min, preco, buffer_min, cor, ativo")
      .eq("business_id", business!.id)
      .order("nome", { ascending: true }),
    // Cliente e pagamento vêm embutidos na mesma query (relação N:1 nos dois
    // sentidos — appointments.client_id e appointment_payments.appointment_id
    // são sempre um único registro) em vez de 2 idas a mais ao banco depois.
    supabase
      .from("appointments")
      .select(
        "id, client_id, service_id, inicio, fim, status, observacoes, entrada_status, entrada_valor, clients(id, nome, telefone), appointment_payments(id, appointment_id, valor, forma_pagamento, origem, entrada_valor)",
      )
      .eq("business_id", business!.id)
      .gte("inicio", dayStart.toISOString())
      .lt("inicio", dayEnd.toISOString())
      .order("inicio", { ascending: true }),
    supabase
      .from("agenda_blocks")
      .select("id, inicio, fim, motivo")
      .eq("business_id", business!.id)
      .gte("inicio", dayStart.toISOString())
      .lt("inicio", dayEnd.toISOString())
      .order("inicio", { ascending: true }),
    // Usados só pra desenhar a grade horária (visão "Grade") — o horário
    // comercial recorrente inteiro (pequeno, poucas linhas por loja).
    supabase.from("business_hours").select("dia_semana, hora_inicio, hora_fim").eq("business_id", business!.id),
    supabase
      .from("business_exceptions")
      .select("data, tipo, hora_inicio, hora_fim")
      .eq("business_id", business!.id)
      .eq("data", dataSelecionada),
  ]);

  // Blocos de expediente do dia selecionado — mesma regra de precedência do
  // motor de disponibilidade pública (exceção > horário comercial da semana),
  // usada só para desenhar a visão em Grade.
  const weekdaySelecionado = new Date(`${dataSelecionada}T00:00:00Z`).getUTCDay();
  const dayBlocks = resolveDayBlocks(
    dataSelecionada,
    weekdaySelecionado,
    businessHours ?? [],
    dayExceptions ?? [],
  );

  const appointmentRows = ((appointmentsRaw ?? []) as unknown as AppointmentEmbedRow[]).map(
    ({ clients, appointment_payments, ...appointment }) => ({ appointment, clients, appointment_payments }),
  );
  const appointments: AgendaAppointment[] = appointmentRows.map((r) => r.appointment);

  const clientsById = new Map<string, AgendaClient>();
  const payments: AgendaPayment[] = [];
  for (const row of appointmentRows) {
    if (row.clients) clientsById.set(row.clients.id, row.clients);
    if (row.appointment_payments) payments.push(row.appointment_payments);
  }
  const clients = [...clientsById.values()];
  const clientIds = [...clientsById.keys()];

  const { data: activeSubs } =
    clientIds.length > 0
      ? await supabase
          .from("client_plan_subs")
          .select("client_id, plan_id, creditos_usados")
          .eq("ativo", true)
          .in("client_id", clientIds)
      : { data: [] };

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
      nomeLoja={business!.nome_loja}
      bufferPadrao={business!.buffer_padrao_min}
      dataSelecionada={dataSelecionada}
      hojeStr={hojeStr}
      services={services ?? []}
      appointments={appointments}
      blocks={blocks ?? []}
      dayBlocks={dayBlocks}
      clients={clients}
      payments={payments}
      clientPlans={clientPlans}
    />
  );
}
