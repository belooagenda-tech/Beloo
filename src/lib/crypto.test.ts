import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "./crypto";

beforeAll(() => {
  // getKey() (dentro de crypto.ts) lê process.env a cada chamada, não no
  // import do módulo — dá pra setar aqui mesmo com o import estático acima.
  process.env.MP_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
});

describe("encryptSecret/decryptSecret", () => {
  it("faz round-trip sem perder o valor original", () => {
    const original = "APP_USR-1234567890-token-de-teste";
    const criptografado = encryptSecret(original);

    expect(criptografado).not.toBe(original);
    expect(criptografado.startsWith("encv1:")).toBe(true);
    expect(decryptSecret(criptografado)).toBe(original);
  });

  it("mantém compatibilidade com valores antigos gravados em texto puro", () => {
    const textoPuroAntigo = "token-salvo-antes-da-criptografia";
    expect(decryptSecret(textoPuroAntigo)).toBe(textoPuroAntigo);
  });

  it("cada chamada gera um IV diferente (o mesmo valor não produz o mesmo ciphertext duas vezes)", () => {
    const a = encryptSecret("mesmo-valor");
    const b = encryptSecret("mesmo-valor");
    expect(a).not.toBe(b);
  });

  it("recusa um valor criptografado adulterado (autenticação do GCM)", () => {
    const criptografado = encryptSecret("valor-original");
    const adulterado = criptografado.slice(0, -2) + "ff";
    expect(() => decryptSecret(adulterado)).toThrow();
  });
});
