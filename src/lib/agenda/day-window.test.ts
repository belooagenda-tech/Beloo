import { describe, it, expect } from "vitest";
import { resolveDayBlocks, type BusinessHourBlock, type ExceptionBlock } from "./day-window";

const HORARIO_COMERCIAL: BusinessHourBlock[] = [
  { dia_semana: 1, hora_inicio: "09:00", hora_fim: "12:00" },
  { dia_semana: 1, hora_inicio: "13:00", hora_fim: "18:00" },
  { dia_semana: 2, hora_inicio: "09:00", hora_fim: "18:00" },
];

describe("resolveDayBlocks", () => {
  it("usa o horário comercial da semana quando não há exceção", () => {
    expect(resolveDayBlocks("2026-08-10", 1, HORARIO_COMERCIAL, [])).toEqual([
      { hora_inicio: "09:00", hora_fim: "12:00" },
      { hora_inicio: "13:00", hora_fim: "18:00" },
    ]);
  });

  it("retorna vazio (fechado) num dia marcado como folga", () => {
    const exceptions: ExceptionBlock[] = [
      { data: "2026-08-10", tipo: "folga", hora_inicio: null, hora_fim: null },
    ];
    expect(resolveDayBlocks("2026-08-10", 1, HORARIO_COMERCIAL, exceptions)).toEqual([]);
  });

  it("usa o horário especial no lugar do horário comercial normal quando há exceção", () => {
    const exceptions: ExceptionBlock[] = [
      { data: "2026-08-10", tipo: "horario_especial", hora_inicio: "14:00", hora_fim: "16:00" },
    ];
    expect(resolveDayBlocks("2026-08-10", 1, HORARIO_COMERCIAL, exceptions)).toEqual([
      { hora_inicio: "14:00", hora_fim: "16:00" },
    ]);
  });

  it("retorna vazio num dia da semana sem nenhum horário comercial cadastrado", () => {
    expect(resolveDayBlocks("2026-08-12", 3, HORARIO_COMERCIAL, [])).toEqual([]);
  });
});
