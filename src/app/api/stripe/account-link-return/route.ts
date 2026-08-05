import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountOnboardingStatus } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

// Retorno do Account Link (onboarding Stripe Connect) do divulgador. O
// webhook account.updated também atualiza stripe_onboarding_completo, mas
// ele pode demorar alguns segundos — checamos direto na Stripe aqui também
// pra o dashboard já abrir com o status certo assim que o divulgador volta.
export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { searchParams } = new URL(request.url);
  const divulgadorId = searchParams.get("divulgador");

  if (!divulgadorId) {
    return NextResponse.redirect(`${siteUrl}/divulgador/dashboard`);
  }

  const admin = createAdminClient();
  const { data: divulgador } = await admin
    .from("divulgadores")
    .select("id, stripe_account_id")
    .eq("id", divulgadorId)
    .maybeSingle();

  if (divulgador?.stripe_account_id) {
    try {
      const status = await getAccountOnboardingStatus(divulgador.stripe_account_id);
      if (status.chargesEnabled) {
        await admin
          .from("divulgadores")
          .update({ stripe_onboarding_completo: true })
          .eq("id", divulgador.id);
      }
    } catch (err) {
      console.error("Beloo: falha ao checar status do onboarding Stripe no retorno", err);
      // Não bloqueia o redirect — o dashboard mostra o aviso de pendência
      // normalmente, e o webhook account.updated ainda pode confirmar depois.
    }
  }

  return NextResponse.redirect(`${siteUrl}/divulgador/dashboard`);
}
