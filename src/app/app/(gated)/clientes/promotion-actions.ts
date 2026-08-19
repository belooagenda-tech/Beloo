"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnBusiness } from "@/lib/supabase/session";
import { sendPushToBusinessClients } from "@/lib/push/send-push";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type SendPromotionResult = { ok: true; enviados: number } | { ok: false; error: string };

const TITULO_MAX = 60;
const MENSAGEM_MAX = 300;

// Dispara push (promoção/cupom/aviso) pra todos os clientes dessa loja que
// já ativaram notificações — reaproveita sendPushToBusinessClients, mesma
// infra de push já usada pra lembrete de agendamento (ver
// src/lib/push/send-push.ts). Sem histórico persistido: broadcast direto,
// não campanha agendada.
export async function sendPromotionAction(input: {
  titulo: string;
  mensagem: string;
}): Promise<SendPromotionResult> {
  const business = await getOwnBusiness();
  if (!business) {
    return { ok: false, error: "Sua sessão expirou. Recarregue a página e tente novamente." };
  }

  const titulo = input.titulo.trim();
  const mensagem = input.mensagem.trim();
  if (!titulo || !mensagem) {
    return { ok: false, error: "Preencha o título e a mensagem." };
  }
  if (titulo.length > TITULO_MAX) {
    return { ok: false, error: `O título pode ter no máximo ${TITULO_MAX} caracteres.` };
  }
  if (mensagem.length > MENSAGEM_MAX) {
    return { ok: false, error: `A mensagem pode ter no máximo ${MENSAGEM_MAX} caracteres.` };
  }

  // Broadcast é fácil de disparar sem querer duas vezes seguidas (duplo
  // clique, aba duplicada) — limite generoso, só pra evitar isso, não pra
  // travar uso legítimo.
  const dentroDoLimite = await checkRateLimit("send_promotion", { windowSeconds: 10 * 60, maxAttempts: 5 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const admin = createAdminClient();
  const { enviados } = await sendPushToBusinessClients(admin, business.id, {
    title: titulo,
    body: mensagem,
    url: `/${business.slug}`,
    tag: "promocao",
  });

  return { ok: true, enviados };
}
