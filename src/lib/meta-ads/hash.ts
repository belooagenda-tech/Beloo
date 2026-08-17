import "server-only";
import { createHash } from "node:crypto";

// Normalização exigida pelo Meta antes de hashear em/ph pra Conversions API:
// lowercase, sem espaços nas pontas. Telefone também perde tudo que não for
// dígito (o Meta espera só números, com código do país, sem formatação).
export function hashEmailForMeta(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function hashPhoneForMeta(phone: string, defaultCountryCode = "55"): string {
  const digits = phone.replace(/\D/g, "");
  // Telefones cadastrados aqui vêm sem código do país (ver validations/onboarding) —
  // assume Brasil quando o número não parece já ter um DDI na frente.
  const withCountryCode = digits.length <= 11 ? `${defaultCountryCode}${digits}` : digits;
  return createHash("sha256").update(withCountryCode).digest("hex");
}
