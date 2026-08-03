import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/mercadopago/state";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/entrar`);
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!business) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/app/configuracoes`);
  }

  const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!clientId || !siteUrl) {
    return NextResponse.redirect(`${siteUrl ?? ""}/app/configuracoes?mp=erro`);
  }

  const state = signState(business.id);
  const redirectUri = `${siteUrl}/api/mercadopago/callback`;

  const authorizeUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("platform_id", "mp");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}
