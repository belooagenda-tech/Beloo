import { describe, it, expect } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { computeAvailableSlots, type BusinessHourBlock } from "./available-slots";

const TIMEZONE = "America/Sao_Paulo";
// Segunda-feira às 08:00 (horário de Brasília) — fixo para os testes serem
// determinísticos independente de quando rodam.
const NOW = new Date("2026-08-10T08:00:00-03:00");

function weekdayOf(date: Date, offsetDias: number): number {
  const dateStr = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
  const alvo = new Date(`${dateStr}T00:00:00Z`);
  alvo.setUTCDate(alvo.getUTCDate() + offsetDias);
  return alvo.getUTCDay();
}

function dateStrOf(date: Date, offsetDias: number): string {
  const dateStr = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
  const alvo = new Date(`${dateStr}T00:00:00Z`);
  alvo.setUTCDate(alvo.getUTCDate() + offsetDias);
  return alvo.toISOString().slice(0, 10);
}

const HORARIO_COMERCIAL: BusinessHourBlock[] = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
  dia_semana: dia,
  hora_inicio: "09:00",
  hora_fim: "18:00",
}));

describe("computeAvailableSlots", () => {
  it("gera slots dentro do horário comercial, respeitando a duração do serviço", () => {
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 0,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [],
      busyAppointments: [],
    });

    const hoje = dateStrOf(NOW, 0);
    expect(result[hoje]).toBeDefined();
    // 09:00–18:00 com serviço de 60min sem buffer = 9 horários (09,10,...,17)
    expect(result[hoje]).toHaveLength(9);
    expect(result[hoje][0]).toContain("09:00:00");
    expect(result[hoje].at(-1)).toContain("17:00:00");
  });

  it("respeita a antecedência mínima (não oferece horário antes de now + antecedência)", () => {
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW, // 08:00
      antecedenciaMinutos: 180, // só a partir das 11:00
      limiteDiasFuturo: 0,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [],
      busyAppointments: [],
    });

    const hoje = dateStrOf(NOW, 0);
    expect(result[hoje][0]).toContain("11:00:00");
  });

  it("não oferece horário que colide com um agendamento existente (considerando o buffer)", () => {
    const hoje = dateStrOf(NOW, 0);
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 0,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [],
      busyAppointments: [
        {
          inicio: `${hoje}T13:00:00-03:00`,
          fim: `${hoje}T14:00:00-03:00`,
          bufferMin: 15,
        },
      ],
    });

    // 13:00 (ocupado) e 12:15–13:00 não cabem mais um slot de 60min antes das
    // 13:00; o buffer de 15min empurra o próximo horário livre pra 14:15.
    expect(result[hoje]).not.toContain(`${hoje}T13:00:00-03:00`);
    expect(result[hoje]).toContain(`${hoje}T14:15:00-03:00`);
  });

  it("não gera nenhum slot num dia marcado como folga", () => {
    const hoje = dateStrOf(NOW, 0);
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 0,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [{ data: hoje, tipo: "folga", hora_inicio: null, hora_fim: null }],
      busyAppointments: [],
    });

    expect(result[hoje]).toBeUndefined();
  });

  it("usa o horário especial no lugar do horário comercial normal quando há exceção", () => {
    const hoje = dateStrOf(NOW, 0);
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 0,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [
        { data: hoje, tipo: "horario_especial", hora_inicio: "14:00", hora_fim: "16:00" },
      ],
      busyAppointments: [],
    });

    expect(result[hoje]).toEqual([`${hoje}T14:00:00-03:00`, `${hoje}T15:00:00-03:00`]);
  });

  it("não gera slots além do limite de dias no futuro", () => {
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 2,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: HORARIO_COMERCIAL,
      exceptions: [],
      busyAppointments: [],
    });

    const diasComSlots = Object.keys(result).sort();
    expect(diasComSlots).toEqual([dateStrOf(NOW, 0), dateStrOf(NOW, 1), dateStrOf(NOW, 2)]);
  });

  it("não gera slots em dias sem nenhum horário comercial cadastrado", () => {
    const apenasSegunda: BusinessHourBlock[] = [
      { dia_semana: weekdayOf(NOW, 0), hora_inicio: "09:00", hora_fim: "18:00" },
    ];
    const result = computeAvailableSlots({
      timezone: TIMEZONE,
      now: NOW,
      antecedenciaMinutos: 0,
      limiteDiasFuturo: 1,
      duracaoMin: 60,
      bufferMin: 0,
      businessHours: apenasSegunda,
      exceptions: [],
      busyAppointments: [],
    });

    expect(result[dateStrOf(NOW, 0)]).toBeDefined();
    expect(result[dateStrOf(NOW, 1)]).toBeUndefined();
  });
});
