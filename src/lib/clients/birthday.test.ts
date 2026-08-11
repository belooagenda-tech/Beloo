import { describe, it, expect } from "vitest";
import { diasAteProximoAniversario } from "./birthday";

describe("diasAteProximoAniversario", () => {
  it("retorna 0 quando o aniversário é hoje", () => {
    const referencia = new Date(2026, 7, 15); // 15/08/2026
    expect(diasAteProximoAniversario("1990-08-15", referencia)).toBe(0);
  });

  it("conta os dias até um aniversário ainda esse ano", () => {
    const referencia = new Date(2026, 7, 10); // 10/08/2026
    expect(diasAteProximoAniversario("1990-08-20", referencia)).toBe(10);
  });

  it("vira pro ano que vem quando o aniversário já passou esse ano", () => {
    const referencia = new Date(2026, 7, 20); // 20/08/2026
    // 05/01 já passou faz tempo em 2026 — próximo é 05/01/2027.
    const dias = diasAteProximoAniversario("1990-01-05", referencia);
    expect(dias).toBeGreaterThan(0);
    const esperado = Math.round(
      (new Date(2027, 0, 5).getTime() - new Date(2026, 7, 20).getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(dias).toBe(esperado);
  });

  it("ignora o ano de nascimento, só usa mês/dia", () => {
    const referencia = new Date(2026, 7, 15);
    expect(diasAteProximoAniversario("1955-08-15", referencia)).toBe(0);
    expect(diasAteProximoAniversario("2010-08-15", referencia)).toBe(0);
  });
});
