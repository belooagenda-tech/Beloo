import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(next: string | null): string | null {
  if (!next) return null;
  // Só permite caminhos internos relativos — nunca uma URL externa
  // (evita open redirect via ?next=https://site-malicioso.com).
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next ?? "/auth/confirmado"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/confirmado?erro=1`);
}
