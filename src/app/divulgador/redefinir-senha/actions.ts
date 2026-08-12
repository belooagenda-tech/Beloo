"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { divulgadorNewPasswordSchema } from "@/lib/validations/divulgador";
import { consumeDivulgadorPasswordResetToken, hashPassword, createDivulgadorSession } from "@/lib/divulgador/auth";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type ResetDivulgadorPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetDivulgadorPasswordAction(
  token: string,
  senha: string,
  confirmarSenha: string,
): Promise<ResetDivulgadorPasswordResult> {
  const dentroDoLimite = await checkRateLimit("divulgador_reset_password", {
    windowSeconds: 15 * 60,
    maxAttempts: 15,
  });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  if (!token) {
    return { ok: false, error: "Link inválido. Peça uma nova recuperação de senha." };
  }

  const parsed = divulgadorNewPasswordSchema.safeParse({ senha, confirmarSenha });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira a senha informada." };
  }

  // Consome o token (uso único) — se já foi usado, expirou (1h) ou nunca
  // existiu, essa chamada retorna null e não muda nada no banco.
  const divulgadorId = await consumeDivulgadorPasswordResetToken(token);
  if (!divulgadorId) {
    return { ok: false, error: "Esse link expirou ou já foi usado. Peça uma nova recuperação de senha." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("divulgadores")
    .update({ senha_hash: hashPassword(parsed.data.senha) })
    .eq("id", divulgadorId);
  if (error) {
    return { ok: false, error: "Não foi possível salvar a nova senha. Tente novamente." };
  }

  // Mesmo padrão do fluxo de profissional: depois de trocar a senha, já
  // entra direto — não faz sentido pedir login de novo com a senha que
  // acabou de definir.
  await createDivulgadorSession(divulgadorId);
  return { ok: true };
}
