import { describe, it, expect } from "vitest";
import {
  BELOO_EXTENDED_PROPERTY_KEY,
  buildAppointmentEventPayload,
  isBelooOwnedEvent,
  toImportableEvent,
} from "./event-mapping";

describe("buildAppointmentEventPayload", () => {
  it("monta o evento com título, horário e a extended property que marca origem Beloo", () => {
    const payload = buildAppointmentEventPayload({
      appointmentId: "apt-1",
      inicioISO: "2026-08-20T13:00:00.000Z",
      fimISO: "2026-08-20T14:00:00.000Z",
      timezone: "America/Sao_Paulo",
      clientNome: "Maria Silva",
      clientTelefone: "21999999999",
      serviceNome: "Corte de cabelo",
    });

    expect(payload.summary).toBe("Corte de cabelo — Maria Silva");
    expect(payload.start).toEqual({ dateTime: "2026-08-20T13:00:00.000Z", timeZone: "America/Sao_Paulo" });
    expect(payload.end).toEqual({ dateTime: "2026-08-20T14:00:00.000Z", timeZone: "America/Sao_Paulo" });
    expect(payload.extendedProperties?.private[BELOO_EXTENDED_PROPERTY_KEY]).toBe("apt-1");
    expect(payload.description).toContain("Maria Silva");
    expect(payload.description).toContain("Agendado via Beloo.");
  });

  it("inclui profissional e observações na descrição quando presentes", () => {
    const payload = buildAppointmentEventPayload({
      appointmentId: "apt-2",
      inicioISO: "2026-08-20T13:00:00.000Z",
      fimISO: "2026-08-20T14:00:00.000Z",
      timezone: "America/Sao_Paulo",
      clientNome: "Maria Silva",
      clientTelefone: "21999999999",
      serviceNome: "Corte de cabelo",
      professionalNome: "João",
      observacoes: "Cliente alérgico a amônia",
    });

    expect(payload.description).toContain("Profissional: João");
    expect(payload.description).toContain("Obs.: Cliente alérgico a amônia");
  });

  it("omite as linhas opcionais quando não informadas", () => {
    const payload = buildAppointmentEventPayload({
      appointmentId: "apt-3",
      inicioISO: "2026-08-20T13:00:00.000Z",
      fimISO: "2026-08-20T14:00:00.000Z",
      timezone: "America/Sao_Paulo",
      clientNome: "Maria Silva",
      clientTelefone: "21999999999",
      serviceNome: "Corte de cabelo",
    });

    expect(payload.description).not.toContain("Profissional:");
    expect(payload.description).not.toContain("Obs.:");
  });
});

describe("isBelooOwnedEvent", () => {
  it("reconhece um evento criado pela Beloo", () => {
    expect(
      isBelooOwnedEvent({ extendedProperties: { private: { belooAppointmentId: "apt-1" } } }),
    ).toBe(true);
  });

  it("não marca um evento comum do usuário como da Beloo", () => {
    expect(isBelooOwnedEvent({})).toBe(false);
    expect(isBelooOwnedEvent({ extendedProperties: { private: {} } })).toBe(false);
    expect(isBelooOwnedEvent({ extendedProperties: { private: { outraCoisa: "x" } } })).toBe(false);
  });
});

describe("toImportableEvent", () => {
  it("converte um evento com horário (dateTime) e marca se já foi importado", () => {
    const event = {
      id: "evt-1",
      summary: "Dentista",
      start: { dateTime: "2026-08-21T13:00:00-03:00" },
      end: { dateTime: "2026-08-21T14:00:00-03:00" },
    };
    expect(toImportableEvent(event, new Set())).toEqual({
      id: "evt-1",
      title: "Dentista",
      startISO: "2026-08-21T13:00:00-03:00",
      endISO: "2026-08-21T14:00:00-03:00",
      allDay: false,
      alreadyImported: false,
    });
    expect(toImportableEvent(event, new Set(["evt-1"]))?.alreadyImported).toBe(true);
  });

  it("marca eventos de dia inteiro (só `date`, sem `dateTime`) como allDay", () => {
    const event = {
      id: "evt-2",
      summary: "Feriado",
      start: { date: "2026-08-22" },
      end: { date: "2026-08-23" },
    };
    expect(toImportableEvent(event, new Set())?.allDay).toBe(true);
  });

  it("usa um título padrão quando o evento não tem summary", () => {
    const event = {
      id: "evt-3",
      start: { dateTime: "2026-08-21T13:00:00-03:00" },
      end: { dateTime: "2026-08-21T14:00:00-03:00" },
    };
    expect(toImportableEvent(event, new Set())?.title).toBe("(Sem título)");
  });

  it("descarta um evento sem início ou fim utilizável", () => {
    const event = { id: "evt-4", start: {}, end: {} };
    expect(toImportableEvent(event, new Set())).toBeNull();
  });
});
