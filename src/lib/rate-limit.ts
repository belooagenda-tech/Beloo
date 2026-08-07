import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Rate limiting das Server Actions públicas (login, cadastro, fluxo de
// agendamento por telefone) — usa a função check_rate_limit() do Postgres
// (ver migration 20260807000001), sem depender de infra externa nova.
//
// Chave por IP: identifica quem está batendo na ação, não quem é o "alvo"
// (ex.: o número de telefone de um cliente), para não deixar um alvo travado
// se alguém tentar abusar em nome dele.

async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "desconhecido";
  }
  return store.get("x-real-ip") ?? "desconhecido";
}

export type RateLimitOptions = {
  /** Duração da janela, em segundos. */
  windowSeconds: number;
  /** Máximo de tentativas permitidas dentro da janela. */
  maxAttempts: number;
};

/**
 * Retorna `true` se a ação pode prosseguir, `false` se o limite foi excedido.
 * Em caso de falha de infraestrutura do rate limiter em si, falha aberto
 * (permite a ação) — o rate limiter é uma camada extra de proteção, não pode
 * virar um novo ponto único de falha para o fluxo principal do produto.
 */
export async function checkRateLimit(action: string, options: RateLimitOptions): Promise<boolean> {
  const ip = await getClientIp();
  const chave = `${action}:${ip}`;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_chave: chave,
    p_janela_segundos: options.windowSeconds,
    p_max_tentativas: options.maxAttempts,
  });

  if (error) {
    console.error("Beloo: falha ao checar rate limit", action, error);
    return true;
  }

  return data === true;
}

export const RATE_LIMIT_MESSAGE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
