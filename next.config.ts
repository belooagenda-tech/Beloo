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
  // 'self' (não 'none') porque o preview ao vivo do Editor Visual (ver
  // src/app/app/editor/[pageKey]/blocks-editor.tsx) mostra a própria página
  // dentro de um iframe — precisa poder se enquadrar, só não pode ser
  // enquadrado por nenhum site de fora.
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // SAMEORIGIN (não DENY): o preview ao vivo do Editor Visual embute a
  // própria página num iframe — mesma origem, então continua bloqueando
  // qualquer site de fora te enquadrar (proteção contra clickjacking
  // intacta), só libera o app se enquadrar nele mesmo.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: {
    // Permite otimizar via next/image a logo da loja, que fica no Storage
    // público do Supabase (bucket "logos") — hostname genérico (não fixo no
    // projeto) porque dev/preview/produção usam projetos Supabase diferentes.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
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
