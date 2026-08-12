import "server-only";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Divulgador } from "@/lib/supabase/types";

// Autenticação própria do divulgador — separada da autenticação de
// profissional/loja (Supabase Auth) e do admin (profiles.is_admin). Senha
// nunca sai em texto puro; sessão é um token opaco em cookie, guardado como
// hash no banco (divulgador_sessions) para permitir logout/revogação real.

const SESSION_COOKIE = "beloo_divulgador_session";
const SESSION_DURATION_DIAS = 30;

const SCRYPT_KEYLEN = 64;

export function hashPassword(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = scryptSync(senha, salt, SCRYPT_KEYLEN);
  return hashBuf.length === derivedBuf.length && timingSafeEqual(hashBuf, derivedBuf);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Cria a sessão e já grava o cookie na resposta — só pode ser chamado de uma
// Server Action ou Route Handler (mesma regra de `cookies().set` do Next).
export async function createDivulgadorSession(divulgadorId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DIAS * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("divulgador_sessions").insert({
    divulgador_id: divulgadorId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error("Não foi possível criar a sessão.");

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Lê o cookie da requisição atual e resolve o divulgador_id da sessão, se
// válida e não expirada. Não renova a expiração (sessão de duração fixa).
export async function getSessionDivulgadorId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("divulgador_sessions")
    .select("divulgador_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  return session.divulgador_id;
}

// Nunca inclui senha_hash — usado nas páginas do dashboard, que precisam dos
// dados do divulgador (não só do id) pra renderizar o aviso de onboarding,
// link de afiliado etc. Mesmo sendo tudo server-side, evita expor o hash da
// senha em qualquer objeto que passe perto de uma resposta ao cliente.
export type DivulgadorSemSenha = Omit<Divulgador, "senha_hash">;

export async function getSessionDivulgador(): Promise<DivulgadorSemSenha | null> {
  const divulgadorId = await getSessionDivulgadorId();
  if (!divulgadorId) return null;

  const admin = createAdminClient();
  const { data: divulgador } = await admin
    .from("divulgadores")
    .select(
      "id, nome, email, codigo_afiliado, stripe_account_id, stripe_onboarding_completo, percentual_comissao, status, criado_em",
    )
    .eq("id", divulgadorId)
    .maybeSingle();
  return divulgador;
}

// Recuperação de senha do divulgador — mesma ideia de divulgador_sessions
// (token opaco, só o hash é gravado), mas de uso único e curta duração. Não
// existe canal de e-mail configurado ainda (sem domínio próprio verificado
// no provedor), então o link com o token em texto puro só existe aqui, na
// hora de notificar o admin (ver requestDivulgadorPasswordResetAction) — não
// tem como recuperá-lo de volta a partir do hash depois.
const PASSWORD_RESET_DURATION_MINUTOS = 60;

export async function createDivulgadorPasswordResetToken(divulgadorId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MINUTOS * 60 * 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("divulgador_password_resets").insert({
    divulgador_id: divulgadorId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error("Não foi possível gerar o link de recuperação.");

  return token;
}

// UPDATE condicional (não usado + não expirado) numa query só — evita a
// janela de corrida de fazer SELECT e depois UPDATE em passos separados; se
// o mesmo token chegar duas vezes ao mesmo tempo, só uma das chamadas
// encontra a linha ainda com used_at nulo.
export async function consumeDivulgadorPasswordResetToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: reset } = await admin
    .from("divulgador_password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("divulgador_id")
    .maybeSingle();

  return reset?.divulgador_id ?? null;
}

export async function destroyDivulgadorSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const admin = createAdminClient();
    await admin.from("divulgador_sessions").delete().eq("token_hash", hashToken(token));
  }
  store.delete(SESSION_COOKIE);
}

// Gera um código de afiliado legível (nome + sufixo aleatório), tentando de
// novo em caso de colisão com o unique de divulgadores.codigo_afiliado.
export function generateCodigoAfiliadoCandidate(nome: string): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 8) || "DIVULGADOR";
  const sufixo = Math.floor(1000 + Math.random() * 9000);
  return `${base}${sufixo}`;
}
