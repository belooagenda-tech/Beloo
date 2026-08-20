import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";
import type { Database } from "@/lib/supabase/types";
import { logError } from "@/lib/logger";
import { getConnectionInfo, getValidAccessToken } from "./connection";
import { deleteEvent, getEvent, insertEvent, updateEvent, GoogleApiError, listEvents } from "./client";
import { buildAppointmentEventPayload, isBelooOwnedEvent, toImportableEvent } from "./event-mapping";
import type { ImportableGoogleEvent } from "./event-mapping";

type Admin = SupabaseClient<Database>;

// Espelha o estado atual de um agendamento na agenda do Google (best-effort:
// nunca lança — quem chama nunca deve ter a ação principal (criar/cancelar
// agendamento) derrubada por causa de uma falha do Google). Chamado depois
// de QUALQUER mutação relevante em `appointments`: cria o evento se ainda
// não existe, atualiza se já existe, ou apaga se o agendamento foi
// cancelado. Reconstruir o payload inteiro a partir do estado atual em vez
// de receber "o que mudou" mantém todos os pontos de chamada simples (um
// único id) e sempre consistentes, mesmo que o próximo campo sincronizado
// só passe a existir depois.
export async function pushAppointmentToGoogle(
  admin: Admin,
  businessId: string,
  appointmentId: string,
): Promise<void> {
  try {
    const connection = await getConnectionInfo(admin, businessId);
    if (!connection || !connection.exportEnabled) return;

    const { data: appointment } = await admin
      .from("appointments")
      .select("id, client_id, service_id, professional_id, inicio, fim, status, observacoes, google_event_id")
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!appointment) return;

    const accessToken = await getValidAccessToken(admin, businessId);
    if (!accessToken) return;

    if (appointment.status === "cancelado") {
      if (appointment.google_event_id) {
        await deleteEvent(accessToken, connection.calendarId, appointment.google_event_id);
        await admin
          .from("appointments")
          .update({ google_event_id: null, google_synced_at: new Date().toISOString() })
          .eq("id", appointmentId);
      }
      return;
    }

    // Ainda esperando o cliente pagar a entrada (fluxo público com entrada
    // ativa) — o horário nem está confirmado de verdade ainda. Não cria
    // evento agora; o webhook do Mercado Pago chama esta mesma função de
    // novo assim que o pagamento aprova e o status vira "agendado".
    if (appointment.status === "aguardando_pagamento") return;

    const [{ data: business }, { data: client }, { data: service }, professional] = await Promise.all([
      admin.from("businesses").select("timezone").eq("id", businessId).single(),
      admin.from("clients").select("nome, telefone").eq("id", appointment.client_id).single(),
      admin.from("services").select("nome").eq("id", appointment.service_id).single(),
      appointment.professional_id
        ? admin.from("professionals").select("nome").eq("id", appointment.professional_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!business || !client || !service) return;

    const payload = buildAppointmentEventPayload({
      appointmentId: appointment.id,
      inicioISO: appointment.inicio,
      fimISO: appointment.fim,
      timezone: business.timezone,
      clientNome: client.nome,
      clientTelefone: client.telefone,
      serviceNome: service.nome,
      professionalNome: professional?.data?.nome ?? null,
      observacoes: appointment.observacoes,
    });

    let googleEventId = appointment.google_event_id;
    try {
      if (googleEventId) {
        await updateEvent(accessToken, connection.calendarId, googleEventId, payload);
      } else {
        const created = await insertEvent(accessToken, connection.calendarId, payload);
        googleEventId = created.id;
      }
    } catch (err) {
      // O evento que a gente tinha guardado foi apagado direto no Google
      // (ex.: o profissional apagou por lá) — recria em vez de propagar erro.
      if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410) && googleEventId) {
        const created = await insertEvent(accessToken, connection.calendarId, payload);
        googleEventId = created.id;
      } else {
        throw err;
      }
    }

    await admin
      .from("appointments")
      .update({ google_event_id: googleEventId, google_synced_at: new Date().toISOString() })
      .eq("id", appointmentId);
  } catch (err) {
    logError("google_calendar.push_appointment", err, { businessId, appointmentId });
  }
}

export type ListImportableEventsResult =
  | { ok: true; events: ImportableGoogleEvent[] }
  | { ok: false; error: string };

// Janela do importador: eventos dos últimos 30 dias (compromissos recentes
// que ainda fazem sentido trazer) até 180 dias à frente — cobre qualquer uso
// razoável sem devolver anos de histórico irrelevante.
const IMPORT_WINDOW_PAST_DAYS = 30;
const IMPORT_WINDOW_FUTURE_DAYS = 180;

export async function listImportableGoogleEvents(
  admin: Admin,
  businessId: string,
): Promise<ListImportableEventsResult> {
  const connection = await getConnectionInfo(admin, businessId);
  if (!connection) return { ok: false, error: "Conecte sua conta do Google Calendar primeiro." };

  const accessToken = await getValidAccessToken(admin, businessId);
  if (!accessToken) {
    return { ok: false, error: "A conexão com o Google Calendar expirou. Reconecte em Configurações." };
  }

  const now = Date.now();
  const timeMinISO = new Date(now - IMPORT_WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const timeMaxISO = new Date(now + IMPORT_WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const rawEvents = await listEvents(accessToken, connection.calendarId, { timeMinISO, timeMaxISO });

    const { data: imports } = await admin
      .from("google_calendar_imports")
      .select("google_event_id")
      .eq("business_id", businessId);
    const importedIds = new Set((imports ?? []).map((i) => i.google_event_id));

    const events = rawEvents
      // Eventos que a própria Beloo criou (agendamentos exportados) nunca
      // aparecem como "pra importar" — importar um de volta viraria um
      // bloqueio duplicado cobrindo um horário que já é um agendamento.
      .filter((event) => !isBelooOwnedEvent(event))
      .map((event) => toImportableEvent(event, importedIds))
      .filter((event): event is ImportableGoogleEvent => event !== null);

    return { ok: true, events };
  } catch (err) {
    logError("google_calendar.list_events", err, { businessId });
    return { ok: false, error: "Não foi possível buscar os eventos do Google Calendar. Tente novamente." };
  }
}

export type ImportGoogleEventsResult =
  | { ok: true; importados: number; jaImportados: number }
  | { ok: false; error: string };

// Traz os eventos escolhidos pro app como bloqueios de horário
// (agenda_blocks) — não como agendamentos de verdade, porque um evento do
// Google não tem cliente/serviço/preço. O efeito prático é o que importa
// pro profissional: o horário aparece ocupado na Agenda e não é oferecido no
// link público de agendamento.
export async function importGoogleEventsAsBlocks(
  admin: Admin,
  businessId: string,
  eventIds: string[],
): Promise<ImportGoogleEventsResult> {
  const connection = await getConnectionInfo(admin, businessId);
  if (!connection) return { ok: false, error: "Conecte sua conta do Google Calendar primeiro." };

  const accessToken = await getValidAccessToken(admin, businessId);
  if (!accessToken) {
    return { ok: false, error: "A conexão com o Google Calendar expirou. Reconecte em Configurações." };
  }

  const { data: business } = await admin.from("businesses").select("timezone").eq("id", businessId).single();
  if (!business) return { ok: false, error: "Loja não encontrada." };

  const { data: existingImports } = await admin
    .from("google_calendar_imports")
    .select("google_event_id")
    .eq("business_id", businessId)
    .in("google_event_id", eventIds);
  const jaImportadosSet = new Set((existingImports ?? []).map((i) => i.google_event_id));

  let importados = 0;
  let jaImportados = 0;

  for (const eventId of eventIds) {
    if (jaImportadosSet.has(eventId)) {
      jaImportados += 1;
      continue;
    }

    try {
      const event = await getEvent(accessToken, connection.calendarId, eventId);
      if (!event || isBelooOwnedEvent(event)) continue;

      const startRaw = event.start.dateTime ?? event.start.date;
      const endRaw = event.end.dateTime ?? event.end.date;
      if (!startRaw || !endRaw) continue;

      // Evento de dia inteiro só tem `date` (ex.: "2026-08-22") — sem
      // horário, interpreta como o dia inteiro no fuso da loja.
      const inicio = event.start.dateTime ? new Date(startRaw) : fromZonedTime(`${startRaw}T00:00:00`, business.timezone);
      const fim = event.end.dateTime ? new Date(endRaw) : fromZonedTime(`${endRaw}T00:00:00`, business.timezone);
      if (fim <= inicio) continue;

      const { data: block, error: blockError } = await admin
        .from("agenda_blocks")
        .insert({
          business_id: businessId,
          professional_id: null,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          motivo: event.summary?.trim() || "Importado do Google Calendar",
          google_event_id: eventId,
        })
        .select("id")
        .single();
      if (blockError || !block) continue;

      await admin
        .from("google_calendar_imports")
        .insert({ business_id: businessId, google_event_id: eventId, agenda_block_id: block.id });
      importados += 1;
    } catch (err) {
      logError("google_calendar.import_event", err, { businessId, eventId });
    }
  }

  return { ok: true, importados, jaImportados };
}
