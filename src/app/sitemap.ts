import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Recalcula no máximo a cada hora — evita bater no Supabase a cada
// crawl/requisição do sitemap.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://beloo.app";

  const estaticas: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const admin = createAdminClient();
  const { data: businesses } = await admin.from("businesses").select("slug, created_at");

  const paginasPublicas: MetadataRoute.Sitemap = (businesses ?? []).map((b) => ({
    url: `${siteUrl}/${b.slug}`,
    lastModified: b.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...estaticas, ...paginasPublicas];
}
