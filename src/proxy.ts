import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { applyReferralCookie } from "@/lib/divulgador/referral-cookie";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Só mexe no cookie de indicação quando a rota é /criar-agenda (ver
  // applyReferralCookie) — não afeta o refresh de sessão do Supabase acima.
  return applyReferralCookie(request, response);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto assets estáticos, imagens e a rota de
     * manifest/service worker do PWA.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
