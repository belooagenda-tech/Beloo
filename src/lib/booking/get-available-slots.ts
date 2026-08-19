import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailableSlots, mergeAvailableSlots, type BusyAppointment } from "./available-slots";

type EligibleProfessional = { id: string; usa_horario_proprio: boolean };

// Uma linha de professional_services embutindo o profissional (via a FK
// professional_id -> professionals) — mesmo padrão de embed já usado no
// resto do projeto (ex.: waitlist_entries.services em app/(gated)/agenda).
type EligibleRow = {
  professional_id: string;
  professionals: { id: string; ativo: boolean; usa_horario_proprio: boolean } | null;
};

// Disponibilidade de um serviço, com suporte a equipe (aba Equipe):
//
// - Serviço sem nenhum profissional vinculado (professional_services vazio)
//   = comportamento legado, idêntico a antes da Equipe existir: um único
//   recurso (a loja inteira), busyAppointments = agendamentos sem
//   profissional atribuído (professional_id null).
// - Serviço com profissionais vinculados: cada profissional elegível e
//   ativo é um recurso independente (própria disponibilidade — horário
//   próprio se configurado, senão o da loja — e própria agenda). Se
//   `professionalId` for informado, retorna só o mapa desse profissional
//   (cliente já escolheu quem quer). Caso contrário, mescla os mapas de
//   todos os elegíveis — representa "pelo menos um profissional livre nesse
//   horário", usado no modo automático ou quando o cliente marca "sem
//   preferência".
export async function getAvailableSlotsForService(
  businessId: string,
  serviceId: string,
  professionalId?: string | null,
) {
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

  const [
    { data: hours },
    { data: exceptions },
    { data: appointments },
    { data: services },
    { data: blocks },
    { data: recurringBlocks },
    { data: eligibleRows },
  ] = await Promise.all([
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
      .select("inicio, fim, service_id, professional_id")
      .eq("business_id", businessId)
      .neq("status", "cancelado")
      .lt("inicio", horizonEnd.toISOString())
      .gt("fim", now.toISOString()),
    supabase.from("services").select("id, buffer_min").eq("business_id", businessId),
    // Bloqueios pontuais criados na Agenda (ex.: almoço) — contam como
    // ocupado igual um agendamento, sem buffer. professional_id null =
    // bloqueia a loja/todo mundo; preenchido = só aquele profissional.
    supabase
      .from("agenda_blocks")
      .select("inicio, fim, professional_id")
      .eq("business_id", businessId)
      .lt("inicio", horizonEnd.toISOString())
      .gt("fim", now.toISOString()),
    // Bloqueios recorrentes (ex.: toda segunda de manhã) são sempre da loja
    // inteira (não têm variante por profissional) — valem pra todo recurso.
    supabase
      .from("recurring_blocks")
      .select("dia_semana, hora_inicio, hora_fim")
      .eq("business_id", businessId),
    // Profissionais vinculados a esse serviço (aba Equipe) — vazio = serviço
    // ainda "legado", sem equipe.
    supabase
      .from("professional_services")
      .select("professional_id, professionals(id, ativo, usa_horario_proprio)")
      .eq("service_id", serviceId),
  ]);

  const eligible: EligibleProfessional[] = ((eligibleRows ?? []) as unknown as EligibleRow[])
    .map((row) => row.professionals)
    .filter((p): p is { id: string; ativo: boolean; usa_horario_proprio: boolean } => p !== null && p.ativo)
    .map((p) => ({ id: p.id, usa_horario_proprio: p.usa_horario_proprio }));

  const bufferByService = new Map((services ?? []).map((s) => [s.id, s.buffer_min]));

  // Cada recurso (a loja "sem profissional" ou um profissional específico)
  // só é bloqueado pelos agendamentos/bloqueios do próprio recurso, mais os
  // bloqueios de agenda que valem pra loja inteira — isso espelha
  // exatamente o que o constraint de exclusão do banco garante (ver
  // supabase/migrations/20260819000001_professionals.sql), então um horário
  // mostrado aqui como livre nunca é rejeitado depois na hora de gravar.
  function busyFor(resourceProfessionalId: string | null): BusyAppointment[] {
    return [
      ...(appointments ?? [])
        .filter((row) => row.professional_id === resourceProfessionalId)
        .map((row) => ({
          inicio: row.inicio,
          fim: row.fim,
          bufferMin: bufferByService.get(row.service_id) ?? business!.buffer_padrao_min,
        })),
      ...(blocks ?? [])
        .filter((row) => row.professional_id === null || row.professional_id === resourceProfessionalId)
        .map((row) => ({ inicio: row.inicio, fim: row.fim, bufferMin: 0 })),
    ];
  }

  async function computeFor(resource: EligibleProfessional | null) {
    let resourceHours = hours ?? [];
    let resourceExceptions = exceptions ?? [];

    if (resource?.usa_horario_proprio) {
      const [{ data: profHours }, { data: profExceptions }] = await Promise.all([
        supabase
          .from("professional_hours")
          .select("dia_semana, hora_inicio, hora_fim")
          .eq("professional_id", resource.id),
        supabase
          .from("professional_exceptions")
          .select("data, tipo, hora_inicio, hora_fim")
          .eq("professional_id", resource.id),
      ]);
      resourceHours = profHours ?? [];
      resourceExceptions = profExceptions ?? [];
    }

    return computeAvailableSlots({
      timezone: business!.timezone,
      now,
      antecedenciaMinutos: business!.antecedencia_minima_min,
      limiteDiasFuturo: business!.limite_dias_futuro,
      duracaoMin: service!.duracao_min,
      bufferMin,
      businessHours: resourceHours,
      exceptions: resourceExceptions,
      busyAppointments: busyFor(resource?.id ?? null),
      recurringBlocks: recurringBlocks ?? [],
    });
  }

  if (eligible.length === 0) {
    return computeFor(null);
  }

  const alvo = professionalId ? eligible.filter((p) => p.id === professionalId) : eligible;
  if (alvo.length === 0) return {};

  const maps = await Promise.all(alvo.map((p) => computeFor(p)));
  return mergeAvailableSlots(maps);
}
