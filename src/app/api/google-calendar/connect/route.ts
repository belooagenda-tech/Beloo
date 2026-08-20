import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/google-calendar/state";
import { buildAuthorizeUrl } from "@/lib/google-calendar/client";

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

  try {
    const state = signState(business.id);
    return NextResponse.redirect(buildAuthorizeUrl(state));
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/app/configuracoes?google=erro`);
  }
}
