"use server";

import { getSessionDivulgador, destroyDivulgadorSession } from "@/lib/divulgador/auth";
import { createAccountOnboardingLink } from "@/lib/stripe/client";

export async function logoutDivulgadorAction(): Promise<void> {
  await destroyDivulgadorSession();
}

export type ResumeOnboardingResult = { ok: true; url: string } | { ok: false; error: string };

export async function resumeOnboardingAction(): Promise<ResumeOnboardingResult> {
  const divulgador = await getSessionDivulgador();
  if (!divulgador) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  }
  if (!divulgador.stripe_account_id) {
    return { ok: false, error: "Conta Stripe não encontrada. Fale com a Beloo." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const url = await createAccountOnboardingLink(
      divulgador.stripe_account_id,
      `${siteUrl}/divulgador/dashboard`,
      `${siteUrl}/api/stripe/account-link-return?divulgador=${divulgador.id}`,
    );
    return { ok: true, url };
  } catch (err) {
    console.error("Beloo: falha ao gerar novo link de onboarding Stripe", err);
    return { ok: false, error: "Não foi possível gerar o link agora. Tente novamente." };
  }
}
