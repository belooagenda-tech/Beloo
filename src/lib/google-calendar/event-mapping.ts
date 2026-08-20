import { formatPhoneBR } from "@/lib/phone";
import type { GoogleCalendarEvent, UpsertEventInput } from "./client";

// Chave usada em extendedProperties.private de todo evento que a Beloo cria
// no Google Calendar (ver sync.ts). É assim — e não uma lista separada de
// "eventos meus" — que o importador (listGoogleCalendarEventsAction)
// reconhece e ignora os próprios eventos da Beloo na hora de listar o que dá
// pra trazer como bloqueio: sem isso, cada agendamento exportado viraria um
// candidato a reimportação, um loop sem necessidade.
export const BELOO_EXTENDED_PROPERTY_KEY = "belooAppointmentId";

export function isBelooOwnedEvent(event: Pick<GoogleCalendarEvent, "extendedProperties">): boolean {
  return Boolean(event.extendedProperties?.private?.[BELOO_EXTENDED_PROPERTY_KEY]);
}

export function buildAppointmentEventPayload(input: {
  appointmentId: string;
  inicioISO: string;
  fimISO: string;
  timezone: string;
  clientNome: string;
  clientTelefone: string;
  serviceNome: string;
  professionalNome?: string | null;
  observacoes?: string | null;
}): UpsertEventInput {
  const linhas = [
    `Cliente: ${input.clientNome}`,
    `WhatsApp: ${formatPhoneBR(input.clientTelefone)}`,
    input.professionalNome ? `Profissional: ${input.professionalNome}` : null,
    input.observacoes ? `Obs.: ${input.observacoes}` : null,
    "Agendado via Beloo.",
  ].filter((linha): linha is string => Boolean(linha));

  return {
    summary: `${input.serviceNome} — ${input.clientNome}`,
    description: linhas.join("\n"),
    start: { dateTime: input.inicioISO, timeZone: input.timezone },
    end: { dateTime: input.fimISO, timeZone: input.timezone },
    extendedProperties: { private: { [BELOO_EXTENDED_PROPERTY_KEY]: input.appointmentId } },
  };
}

export type ImportableGoogleEvent = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  allDay: boolean;
  alreadyImported: boolean;
};

// Converte a resposta bruta da Calendar API pro formato que o picker de
// importação mostra — já filtrando fora os próprios eventos da Beloo
// (isBelooOwnedEvent) antes de chamar esta função é responsabilidade de
// quem chama (sync.ts), pra manter esta função simples de testar.
export function toImportableEvent(
  event: GoogleCalendarEvent,
  importedEventIds: Set<string>,
): ImportableGoogleEvent | null {
  const start = event.start.dateTime ?? event.start.date;
  const end = event.end.dateTime ?? event.end.date;
  if (!start || !end) return null;

  return {
    id: event.id,
    title: event.summary?.trim() || "(Sem título)",
    startISO: start,
    endISO: end,
    allDay: Boolean(event.start.date && !event.start.dateTime),
    alreadyImported: importedEventIds.has(event.id),
  };
}
