import type { NextConfig } from "next";

// Content-Security-Policy em modo Report-Only: nada é bloqueado, só reportado
// no console do navegador (DevTools > Console mostra os avisos "would have
// blocked..."). Propositalmente cauteloso — nenhum SDK externo é carregado
// no client hoje (Stripe/Mercado Pago só redirecionam para páginas hospedadas
// deles, nunca embutem script no app), então a política pode ficar restrita.
// Depois de rodar em produção por um tempo sem nenhum aviso inesperado no
// console, trocar o header abaixo para "Content-Security-Policy" (sem o
// "-Report-Only") liga a aplicação de verdade.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
