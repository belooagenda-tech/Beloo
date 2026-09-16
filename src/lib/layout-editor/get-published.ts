import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { themeContentSchema, type ThemeContent } from "./theme-schema";
import { landingContentSchema, type LandingContent } from "./landing-schema";
import type { PageKey } from "./pages";

// Deduplicado por request (mesmo padrão de src/lib/supabase/session.ts) —
// tema + landing costumam ser lidos juntos no mesmo request (root layout +
// página), então sem isso seria 1 query a mais por página renderizada.
const fetchLayoutRow = cache(async (pageKey: PageKey) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("layout_drafts")
    .select("draft_content, published_content")
    .eq("page_key", pageKey)
    .maybeSingle();
  return data;
});

// Linha ainda não publicada (`{}`) faz o app renderizar exatamente o visual
// hardcoded de hoje — zero mudança até alguém publicar pela 1ª vez.
export const getPublishedTheme = cache(async (): Promise<ThemeContent> => {
  const row = await fetchLayoutRow("global-theme");
  const parsed = themeContentSchema.safeParse(row?.published_content ?? {});
  return parsed.success ? parsed.data : {};
});

export const getPublishedLanding = cache(async (): Promise<LandingContent> => {
  const row = await fetchLayoutRow("landing");
  const parsed = landingContentSchema.safeParse(row?.published_content ?? {});
  return parsed.success ? parsed.data : {};
});

export const getDraftTheme = cache(async (): Promise<ThemeContent> => {
  const row = await fetchLayoutRow("global-theme");
  const parsed = themeContentSchema.safeParse(row?.draft_content ?? {});
  return parsed.success ? parsed.data : {};
});

export const getDraftLanding = cache(async (): Promise<LandingContent> => {
  const row = await fetchLayoutRow("landing");
  const parsed = landingContentSchema.safeParse(row?.draft_content ?? {});
  return parsed.success ? parsed.data : {};
});

// Metadados de rascunho/publicação (pra mostrar "alterações não publicadas",
// quem editou/publicou por último) — usado só na UI do Editor.
export const getLayoutMeta = cache(async (pageKey: PageKey) => {
  const row = await fetchLayoutRowFull(pageKey);
  return row;
});

const fetchLayoutRowFull = cache(async (pageKey: PageKey) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("layout_drafts")
    .select("draft_content, published_content, updated_at, updated_by, published_at, published_by")
    .eq("page_key", pageKey)
    .maybeSingle();
  return data;
});
