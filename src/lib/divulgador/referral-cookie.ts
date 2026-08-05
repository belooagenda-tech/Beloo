import { NextResponse, type NextRequest } from "next/server";

// Rastreio de indicação de divulgador: quem chega em /criar-agenda com
// ?ref=CODIGO leva um cookie por 60 dias. A criação do vínculo em
// `indicacoes` só acontece depois, quando o profissional realmente termina
// de criar a loja (ver src/app/criar-agenda/actions.ts) — aqui só guarda o
// código pra esse momento.
export const REF_COOKIE_NAME = "beloo_ref";
const REF_COOKIE_MAX_AGE_DIAS = 60;

export function applyReferralCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.nextUrl.pathname !== "/criar-agenda") return response;

  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return response;

  response.cookies.set(REF_COOKIE_NAME, ref, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REF_COOKIE_MAX_AGE_DIAS * 24 * 60 * 60,
  });
  return response;
}
