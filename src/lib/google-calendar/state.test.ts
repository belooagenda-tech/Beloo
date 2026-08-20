import { describe, it, expect, beforeAll, vi } from "vitest";
import { signState, verifyState } from "./state";

beforeAll(() => {
  process.env.GOOGLE_CALENDAR_STATE_SECRET = "segredo-de-teste-do-state";
});

describe("google-calendar state", () => {
  it("assina e confere um business_id válido", () => {
    const state = signState("11111111-1111-1111-1111-111111111111");
    expect(verifyState(state)).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("rejeita um state adulterado (business_id trocado depois de assinado)", () => {
    const state = signState("11111111-1111-1111-1111-111111111111");
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [, timestamp, signature] = decoded.split(".");
    const adulterado = Buffer.from(
      `22222222-2222-2222-2222-222222222222.${timestamp}.${signature}`,
    ).toString("base64url");
    expect(verifyState(adulterado)).toBeNull();
  });

  it("rejeita um state assinado com outro segredo", () => {
    const state = signState("11111111-1111-1111-1111-111111111111");
    process.env.GOOGLE_CALENDAR_STATE_SECRET = "outro-segredo";
    expect(verifyState(state)).toBeNull();
    process.env.GOOGLE_CALENDAR_STATE_SECRET = "segredo-de-teste-do-state";
  });

  it("rejeita um state expirado (mais de 10 minutos)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const state = signState("11111111-1111-1111-1111-111111111111");
    vi.setSystemTime(new Date("2026-01-01T00:11:00Z"));
    expect(verifyState(state)).toBeNull();
    vi.useRealTimers();
  });

  it("rejeita lixo/formato inesperado", () => {
    expect(verifyState("nao-e-base64url-valido-com-3-partes")).toBeNull();
    expect(verifyState(Buffer.from("so.duas").toString("base64url"))).toBeNull();
  });
});
