import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyState } from "@/lib/mercadopago/state";
import { exchangeCodeForToken } from "@/lib/mercadopago/client";
import { encryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?mp=erro`);
  }

  const businessId = verifyState(state);
  if (!businessId) {
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?mp=erro`);
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const admin = createAdminClient();

    // Guarda o e-mail do vendedor conectado só para exibir na tela de
    // Configurações — busca via /users/me com o token recém-obtido.
    let mpEmail: string | null = null;
    try {
      const meResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (meResponse.ok) {
        const me = await meResponse.json();
        mpEmail = me.email ?? null;
      }
    } catch {
      // não bloqueia a conexão por causa disso
    }

    await admin.from("mp_connections").upsert(
      {
        business_id: businessId,
        mp_user_id: tokens.userId,
        mp_email: mpEmail,
        access_token: encryptSecret(tokens.accessToken),
        refresh_token: encryptSecret(tokens.refreshToken),
        public_key: tokens.publicKey,
        token_expires_at: new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString(),
      },
      { onConflict: "business_id" },
    );

    return NextResponse.redirect(`${siteUrl}/app/configuracoes?mp=conectado`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/app/configuracoes?mp=erro`);
  }
}
