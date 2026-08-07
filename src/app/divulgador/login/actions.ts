"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { divulgadorLoginSchema } from "@/lib/validations/divulgador";
import { verifyPassword, createDivulgadorSession } from "@/lib/divulgador/auth";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type LoginDivulgadorResult = { ok: true } | { ok: false; error: string };

export async function loginDivulgadorAction(input: {
  email: string;
  senha: string;
}): Promise<LoginDivulgadorResult> {
  const dentroDoLimite = await checkRateLimit("divulgador_login", { windowSeconds: 15 * 60, maxAttempts: 10 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const parsed = divulgadorLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  }

  const admin = createAdminClient();
  const emailNormalizado = parsed.data.email.trim().toLowerCase();

  const { data: divulgador } = await admin
    .from("divulgadores")
    .select("id, senha_hash, status")
    .eq("email", emailNormalizado)
    .maybeSingle();

  // Mesma mensagem genérica pra e-mail inexistente e senha errada — não
  // revela se o e-mail está cadastrado.
  if (!divulgador || !verifyPassword(parsed.data.senha, divulgador.senha_hash)) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  if (divulgador.status !== "ativo") {
    return { ok: false, error: "Seu cadastro de divulgador está inativo. Fale com a Beloo." };
  }

  await createDivulgadorSession(divulgador.id);
  return { ok: true };
}
