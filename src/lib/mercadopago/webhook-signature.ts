import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Verifica a assinatura que o Mercado Pago envia no header `x-signature` das
// notificações de webhook, conforme o formato documentado por eles:
// header "ts=<unix_ms>,v1=<hmac_hex>", manifest "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks#editor_5
export function verifyWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret || !xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((piece) => {
      const [key, value] = piece.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  const v1Buf = Buffer.from(v1, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  return v1Buf.length === expectedBuf.length && timingSafeEqual(v1Buf, expectedBuf);
}
