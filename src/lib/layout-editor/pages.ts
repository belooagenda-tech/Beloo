// Registro estático das "páginas" que o Editor Visual pode alterar — mesmo
// espírito de src/components/app-shell/nav-items.ts. Cada page_key precisa
// existir como linha em public.layout_drafts (ver migration
// 20260916000001_layout_editor.sql).
export const EDITABLE_PAGES = [
  {
    key: "global-theme",
    label: "Tema Global",
    description: "Cor, fontes e bordas — vale para todo o aplicativo (landing e telas internas).",
  },
  {
    key: "landing",
    label: "Landing Page",
    description: "Página inicial pública (beloo.app) — textos, cards e imagens.",
  },
] as const;

export type PageKey = (typeof EDITABLE_PAGES)[number]["key"];

export function isPageKey(value: string): value is PageKey {
  return EDITABLE_PAGES.some((p) => p.key === value);
}
