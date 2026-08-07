import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./webhook-signature";

const SEGREDO = "segredo-de-teste-do-webhook";

function assinar(dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", SEGREDO).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

beforeAll(() => {
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = SEGREDO;
});

describe("verifyWebhookSignature", () => {
  it("aceita uma assinatura válida", () => {
    const dataId = "123456789";
    const requestId = "req-abc";
    const ts = "1700000000000";
    const ok = verifyWebhookSignature({
      xSignature: assinar(dataId, requestId, ts),
      xRequestId: requestId,
      dataId,
    });
    expect(ok).toBe(true);
  });

  it("rejeita quando o segredo usado pra assinar é diferente", () => {
    const dataId = "123456789";
    const requestId = "req-abc";
    const ts = "1700000000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1Errado = createHmac("sha256", "outro-segredo").update(manifest).digest("hex");
    const ok = verifyWebhookSignature({
      xSignature: `ts=${ts},v1=${v1Errado}`,
      xRequestId: requestId,
      dataId,
    });
    expect(ok).toBe(false);
  });

  it("rejeita quando o data.id foi trocado depois de assinado", () => {
    const assinatura = assinar("123456789", "req-abc", "1700000000000");
    const ok = verifyWebhookSignature({
      xSignature: assinatura,
      xRequestId: "req-abc",
      dataId: "999999999", // diferente do que foi assinado
    });
    expect(ok).toBe(false);
  });

  it("rejeita quando faltam headers", () => {
    expect(verifyWebhookSignature({ xSignature: null, xRequestId: "req-abc", dataId: "123" })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: "ts=1,v1=abc", xRequestId: null, dataId: "123" })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: "ts=1,v1=abc", xRequestId: "req-abc", dataId: null })).toBe(false);
  });

  it("rejeita quando o header x-signature vem com formato inesperado", () => {
    const ok = verifyWebhookSignature({
      xSignature: "formato-invalido-sem-v1-nem-ts",
      xRequestId: "req-abc",
      dataId: "123",
    });
    expect(ok).toBe(false);
  });
});
