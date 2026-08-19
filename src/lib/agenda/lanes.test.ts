import { describe, it, expect } from "vitest";
import { computeLanes } from "./lanes";

describe("computeLanes", () => {
  it("dá lane 0 e lanesTotal 1 pra itens que não se sobrepõem", () => {
    const result = computeLanes([
      { id: "a", inicio: 540, fim: 600 }, // 09:00–10:00
      { id: "b", inicio: 600, fim: 660 }, // 10:00–11:00 (encosta, não sobrepõe)
    ]);

    expect(result.get("a")).toEqual({ lane: 0, lanesTotal: 1 });
    expect(result.get("b")).toEqual({ lane: 0, lanesTotal: 1 });
  });

  it("abre uma segunda coluna para dois itens simultâneos", () => {
    const result = computeLanes([
      { id: "a", inicio: 540, fim: 600 },
      { id: "b", inicio: 550, fim: 610 },
    ]);

    expect(result.get("a")?.lanesTotal).toBe(2);
    expect(result.get("b")?.lanesTotal).toBe(2);
    expect(result.get("a")?.lane).not.toBe(result.get("b")?.lane);
  });

  it("reaproveita uma coluna liberada em vez de abrir uma terceira", () => {
    // a: 9-10, b: 9-10 (sobrepõe a -> 2 colunas), c: 10-11 (só sobrepõe o
    // cluster pelo b que termina junto, reaproveita a coluna do "a").
    const result = computeLanes([
      { id: "a", inicio: 540, fim: 600 },
      { id: "b", inicio: 540, fim: 660 },
      { id: "c", inicio: 600, fim: 660 },
    ]);

    expect(result.get("a")?.lanesTotal).toBe(2);
    expect(result.get("b")?.lanesTotal).toBe(2);
    expect(result.get("c")?.lanesTotal).toBe(2);
    expect(result.get("a")?.lane).toBe(result.get("c")?.lane);
    expect(result.get("b")?.lane).not.toBe(result.get("c")?.lane);
  });

  it("mantém clusters distantes independentes (um cluster de 3 não afasta um item sozinho depois)", () => {
    const result = computeLanes([
      { id: "a", inicio: 540, fim: 600 },
      { id: "b", inicio: 545, fim: 605 },
      { id: "c", inicio: 550, fim: 610 },
      { id: "d", inicio: 900, fim: 960 }, // bem depois, sem overlap com ninguém
    ]);

    expect(result.get("a")?.lanesTotal).toBe(3);
    expect(result.get("d")).toEqual({ lane: 0, lanesTotal: 1 });
  });

  it("retorna mapa vazio pra lista vazia", () => {
    expect(computeLanes([]).size).toBe(0);
  });
});
