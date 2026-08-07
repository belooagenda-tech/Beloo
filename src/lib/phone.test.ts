import { describe, it, expect } from "vitest";
import { normalizePhone, isValidBrazilianPhone, formatPhoneBR } from "./phone";

describe("normalizePhone", () => {
  it("remove tudo que não é dígito", () => {
    expect(normalizePhone("(21) 97265-2314")).toBe("21972652314");
    expect(normalizePhone("+55 21 97265-2314")).toBe("5521972652314");
  });
});

describe("isValidBrazilianPhone", () => {
  it("aceita celular com DDD (11 dígitos)", () => {
    expect(isValidBrazilianPhone("(21) 97265-2314")).toBe(true);
  });

  it("aceita fixo com DDD (10 dígitos)", () => {
    expect(isValidBrazilianPhone("(21) 3265-2314")).toBe(true);
  });

  it("rejeita número sem DDD", () => {
    expect(isValidBrazilianPhone("97265-2314")).toBe(false);
  });

  it("rejeita string vazia ou só texto", () => {
    expect(isValidBrazilianPhone("")).toBe(false);
    expect(isValidBrazilianPhone("abc")).toBe(false);
  });

  it("rejeita número com dígitos demais (ex.: com código do país colado sem tratar)", () => {
    expect(isValidBrazilianPhone("5521972652314")).toBe(false);
  });
});

describe("formatPhoneBR", () => {
  it("formata celular (11 dígitos)", () => {
    expect(formatPhoneBR("21972652314")).toBe("(21) 97265-2314");
  });

  it("formata fixo (10 dígitos)", () => {
    expect(formatPhoneBR("2132652314")).toBe("(21) 3265-2314");
  });

  it("devolve a entrada original se não bater com nenhum formato conhecido", () => {
    expect(formatPhoneBR("123")).toBe("123");
  });
});
