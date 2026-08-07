"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { divulgadorCadastroSchema } from "@/lib/validations/divulgador";
import {
  hashPassword,
  generateCodigoAfiliadoCandidate,
  createDivulgadorSession,
} from "@/lib/divulgador/auth";
import { createExpressAccount, createAccountOnboardingLink } from "@/lib/stripe/client";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type RegisterDivulgadorResult =
  | { ok: true; onboardingUrl: string }
  | { ok: false; error: string };

const MAX_TENTATIVAS_CODIGO = 5;

async function gerarCodigoAfiliadoDisponivel(nome: string): Promise<string> {
  const admin = createAdminClient();
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_CODIGO; tentativa++) {
    const candidato = generateCodigoAfiliadoCandidate(nome);
    const { data: emUso } = await admin
      .from("divulgadores")
      .select("id")
      .eq("codigo_afiliado", candidato)
      .maybeSingle();
    if (!emUso) return candidato;
  }
  // Extremamente improvável (5 colisões seguidas) — cai pra um sufixo maior.
  return `${generateCodigoAfiliadoCandidate(nome)}${Date.now().toString().slice(-4)}`;
}

export async function registerDivulgadorAction(input: {
  nome: string;
  email: string;
  senha: string;
}): Promise<RegisterDivulgadorResult> {
  const dentroDoLimite = await checkRateLimit("divulgador_cadastro", { windowSeconds: 60 * 60, maxAttempts: 5 });
  if (!dentroDoLimite) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const parsed = divulgadorCadastroSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  }

  const admin = createAdminClient();
  const emailNormalizado = parsed.data.email.trim().toLowerCase();

  const { data: existente } = await admin
    .from("divulgadores")
    .select("id")
    .eq("email", emailNormalizado)
    .maybeSingle();
  if (existente) {
    return { ok: false, error: "Já existe um cadastro de divulgador com esse e-mail." };
  }

  const senhaHash = hashPassword(parsed.data.senha);
  const codigoAfiliado = await gerarCodigoAfiliadoDisponivel(parsed.data.nome);

  let stripeAccountId: string;
  try {
    stripeAccountId = await createExpressAccount(emailNormalizado);
  } catch (err) {
    console.error("Beloo: falha ao criar conta Stripe Connect do divulgador", err);
    return { ok: false, error: "Não foi possível iniciar seu cadastro agora. Tente novamente." };
  }

  const { data: divulgador, error } = await admin
    .from("divulgadores")
    .insert({
      nome: parsed.data.nome.trim(),
      email: emailNormalizado,
      senha_hash: senhaHash,
      codigo_afiliado: codigoAfiliado,
      stripe_account_id: stripeAccountId,
    })
    .select("id")
    .single();

  if (error || !divulgador) {
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  await createDivulgadorSession(divulgador.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const onboardingUrl = await createAccountOnboardingLink(
      stripeAccountId,
      // refresh_url: a Stripe manda de volta pra cá se o link expirar no meio
      // do preenchimento — o dashboard detecta que ainda está pendente e
      // mostra o botão de retomar.
      `${siteUrl}/divulgador/dashboard`,
      `${siteUrl}/api/stripe/account-link-return?divulgador=${divulgador.id}`,
    );
    return { ok: true, onboardingUrl };
  } catch (err) {
    console.error("Beloo: falha ao gerar link de onboarding Stripe", err);
    // O cadastro já foi criado e a sessão já começou — manda pro dashboard,
    // que mostra o aviso de onboarding pendente com botão pra tentar de novo.
    return { ok: true, onboardingUrl: `${siteUrl}/divulgador/dashboard` };
  }
}
