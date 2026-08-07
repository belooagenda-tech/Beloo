import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Criptografia em repouso para segredos de terceiros que guardamos no banco
// (hoje: access_token/refresh_token do OAuth do Mercado Pago em
// mp_connections — capazes de mover dinheiro na conta conectada do
// profissional). RLS + service role já protegem o acesso via API, mas isso
// aqui é uma camada extra: um vazamento da service_role key ou de um backup
// do banco não expõe os tokens em texto puro (achado 🔴 da auditoria de
// 2026-08-07).
//
// AES-256-GCM: autenticado (detecta adulteração), IV aleatório por valor.

const ALGO = "aes-256-gcm";
const ENC_PREFIX = "encv1:";

function getKey(): Buffer {
  const secret = process.env.MP_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("MP_TOKEN_ENCRYPTION_KEY não configurado.");
  }
  // Aceita uma chave hex de 32 bytes (64 chars) gerada com
  // `openssl rand -hex 32`, ou qualquer string (deriva 32 bytes via scrypt).
  if (/^[0-9a-f]{64}$/i.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return scryptSync(secret, "beloo-mp-token-v1", 32);
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descriptografa um valor gravado por `encryptSecret`. Valores antigos,
 * gravados antes dessa migração (texto puro, sem o prefixo), são devolvidos
 * como estão — permite migrar sem downtime: cada conexão passa a ser
 * criptografada na próxima vez que for gravada (ver connection.ts).
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  const key = getKey();
  const [, ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Valor criptografado em formato inesperado.");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
