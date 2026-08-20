import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.GOOGLE_CALENDAR_STATE_SECRET;
  if (!value) throw new Error("GOOGLE_CALENDAR_STATE_SECRET não configurado.");
  return value;
}

// Mesmo padrão de src/lib/mercadopago/state.ts — o callback do OAuth do
// Google é uma rota pública (chamada pelo redirect do Google, sem sessão do
// usuário), então o `state` carrega o business_id assinado pra o callback
// confiar em qual loja está conectando.
export function signState(businessId: string): string {
  const payload = `${businessId}.${Date.now()}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [businessId, timestamp, signature] = parts;

  const payload = `${businessId}.${timestamp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");

  const signatureBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  // state expira em 10 minutos — tempo de sobra para o usuário completar o
  // login/autorização no Google.
  const ageMs = Date.now() - Number(timestamp);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 10 * 60 * 1000) return null;

  return businessId;
}
