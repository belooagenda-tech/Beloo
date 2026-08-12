"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { divulgadorForgotPasswordSchema } from "@/lib/validations/divulgador";
import { createDivulgadorPasswordResetToken } from "@/lib/divulgador/auth";
import { notifyAdmins } from "@/lib/push/notify";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export type RequestDivulgadorPasswordResetResult = { ok: true } | { ok: false; error: string };

// Sem provedor de e-mail configurado ainda (o site está no domínio padrão da
// Vercel, sem domínio próprio verificado num serviço de envio) — o link de
// recuperação chega pro admin da Beloo pelo sino/push (mesmo mecanismo de
// notifyAdminsOfNewSignupAction), que repassa manualmente pro divulgador.
// Sempre retorna "ok" independente do e-mail existir ou não, pra não revelar
// quais e-mails têm cadastro — mesmo cuidado do fluxo de profissional.
export async function requestDivulgadorPasswordResetAction(
  email: string,
): Promise<RequestDivulgadorPasswordResetResult> {
  const dentroDoLimite = await checkRateLimit("divulgador_forgot_password", {
    windowSeconds: 15 * 60,
    maxAttempts: 10,
  });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const parsed = divulgadorForgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido." };
  }

  const admin = createAdminClient();
  const emailNormalizado = parsed.data.email.trim().toLowerCase();

  const { data: divulgador } = await admin
    .from("divulgadores")
    .select("id, nome, email, status")
    .eq("email", emailNormalizado)
    .maybeSingle();

  if (divulgador && divulgador.status === "ativo") {
    try {
      const token = await createDivulgadorPasswordResetToken(divulgador.id);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const link = `${siteUrl}/divulgador/redefinir-senha?token=${token}`;

      await notifyAdmins(admin, {
        tipo: "divulgador_recuperacao_senha",
        titulo: "Divulgador pediu recuperação de senha",
        corpo: `${divulgador.nome} (${divulgador.email}) esqueceu a senha. Link válido por 1h — repasse por WhatsApp: ${link}`,
        url: "/app/admin",
      });
    } catch (err) {
      // Não bloqueia a resposta genérica pro divulgador — só registra pra
      // investigar depois.
      logError("divulgador.esqueci_senha.gerar_token", err, { divulgadorId: divulgador.id });
    }
  }

  return { ok: true };
}
