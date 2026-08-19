"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnBusiness, getOwnProfile } from "@/lib/supabase/session";
import { notifyAdmins } from "@/lib/push/notify";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import type { SupportMessage } from "@/lib/supabase/types";

export type SendSupportMessageResult = { ok: true; message: SupportMessage } | { ok: false; error: string };

const MENSAGEM_MAX = 2000;
const TRECHO_NOTIFICACAO = 120;

export async function sendSupportMessageAction(mensagemBruta: string): Promise<SendSupportMessageResult> {
  const business = await getOwnBusiness();
  const profile = await getOwnProfile();
  if (!business || !profile) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const mensagem = mensagemBruta.trim();
  if (mensagem.length < 5) {
    return { ok: false, error: "Escreva uma mensagem um pouco mais detalhada." };
  }
  if (mensagem.length > MENSAGEM_MAX) {
    return { ok: false, error: `A mensagem pode ter no máximo ${MENSAGEM_MAX} caracteres.` };
  }

  const dentroDoLimite = await checkRateLimit("send_support_message", { windowSeconds: 10 * 60, maxAttempts: 10 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const admin = createAdminClient();
  const { data: message, error } = await admin
    .from("support_messages")
    .insert({ business_id: business.id, profile_id: profile.id, mensagem })
    .select("id, business_id, profile_id, mensagem, lida, created_at")
    .single();

  if (error || !message) {
    return { ok: false, error: "Não foi possível enviar. Tente novamente." };
  }

  try {
    await notifyAdmins(admin, {
      tipo: "mensagem_suporte",
      titulo: "Nova mensagem de suporte",
      corpo: `${business.nome_loja}: ${
        mensagem.length > TRECHO_NOTIFICACAO ? `${mensagem.slice(0, TRECHO_NOTIFICACAO)}…` : mensagem
      }`,
      url: "/app/admin/suporte",
    });
  } catch {
    // A mensagem já foi salva; falha ao notificar não pode derrubar a
    // resposta pro profissional.
  }

  return { ok: true, message };
}
