import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyState } from "@/lib/google-calendar/state";
import { exchangeCodeForTokens, fetchUserEmail } from "@/lib/google-calendar/client";
import { encryptSecret } from "@/lib/crypto";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    // Usuário cancelou a tela de consentimento do Google, ou o Google negou
    // por algum motivo — não é uma falha nossa, só volta sem criar conexão.
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?google=cancelado`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?google=erro`);
  }

  const businessId = verifyState(state);
  if (!businessId) {
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?google=erro`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refreshToken) {
      // Sem prompt=consent isso não deveria acontecer, mas se a conta já
      // tinha consentido e por algum motivo o Google não devolveu um
      // refresh_token novo, não dá pra manter a conexão funcionando depois
      // que o access_token expirar — melhor falhar aqui e pedir pra
      // reconectar do que salvar uma conexão que vai parar de sincronizar
      // sozinha em menos de uma hora.
      throw new Error("Google não devolveu refresh_token");
    }

    const email = await fetchUserEmail(tokens.accessToken);
    const admin = createAdminClient();

    await admin.from("google_calendar_connections").upsert(
      {
        business_id: businessId,
        google_email: email,
        access_token: encryptSecret(tokens.accessToken),
        refresh_token: encryptSecret(tokens.refreshToken),
        token_expires_at: new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );

    return NextResponse.redirect(`${siteUrl}/app/configuracoes?google=conectado`);
  } catch (err) {
    logError("google_calendar.callback", err, { businessId });
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?google=erro`);
  }
}
