import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("remove acentos e caixa alta", () => {
    expect(slugify("Salão da Ána")).toBe("salao-da-ana");
  });

  it("troca espaços e símbolos por hífen único", () => {
    expect(slugify("Studio  M&M  ---  Beauty")).toBe("studio-m-m-beauty");
  });

  it("remove hífens nas pontas", () => {
    expect(slugify("--Studio--")).toBe("studio");
  });

  it("limita a 40 caracteres", () => {
    const entrada = "a".repeat(60);
    expect(slugify(entrada).length).toBe(40);
  });

  it("resultado é sempre um slug válido conforme o constraint do banco (^[a-z0-9]+(-[a-z0-9]+)*$)", () => {
    const regexBanco = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const casos = ["Barbearia do Zé!", "  espaços  nas pontas  ", "123 Studio", "áéíóú çãõ"];
    for (const caso of casos) {
      const resultado = slugify(caso);
      if (resultado.length > 0) {
        expect(resultado, `slugify("${caso}") -> "${resultado}"`).toMatch(regexBanco);
      }
    }
  });
});
