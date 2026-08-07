import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://beloo.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Área logada e rotas técnicas não têm nada a indexar; agendas
        // públicas (/[slug]) e a landing continuam liberadas.
        disallow: ["/app/", "/api/", "/auth/", "/divulgador/", "/criar-agenda", "/entrar"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
