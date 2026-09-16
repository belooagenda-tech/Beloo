// Registro estático das "páginas" que o Editor Visual pode alterar — mesmo
// espírito de src/components/app-shell/nav-items.ts. Cada page_key precisa
// existir como linha em public.layout_drafts (ver migrations
// 20260916000001_layout_editor.sql e 20260916000002_layout_editor_app_pages.sql).
//
// type "theme" = tema global (cor/fonte/borda), type "landing" = conteúdo
// por seção da landing, type "blocks" = blocos de texto/imagem avulsos
// inseridos antes/depois do conteúdo funcional de uma tela interna (nunca
// dentro dela — tabela/agenda/formulário continuam intocados).
export const EDITABLE_PAGES = [
  {
    key: "global-theme",
    label: "Tema Global",
    description: "Cor, fontes e bordas — vale para todo o aplicativo (landing e telas internas).",
    type: "theme",
    path: "/",
  },
  {
    key: "landing",
    label: "Landing Page",
    description: "Página inicial pública (beloo.app) — textos, cards e imagens.",
    type: "landing",
    path: "/",
  },
  { key: "app-painel", label: "Painel", description: "Tela inicial do app.", type: "blocks", path: "/app" },
  {
    key: "app-primeiros-passos",
    label: "Primeiros passos",
    description: "Guia de configuração inicial.",
    type: "blocks",
    path: "/app/primeiros-passos",
  },
  { key: "app-agenda", label: "Agenda", description: "Agenda do dia.", type: "blocks", path: "/app/agenda" },
  {
    key: "app-servicos",
    label: "Serviços",
    description: "Cadastro de serviços.",
    type: "blocks",
    path: "/app/servicos",
  },
  {
    key: "app-produtos",
    label: "Produtos",
    description: "Cadastro de produtos.",
    type: "blocks",
    path: "/app/produtos",
  },
  { key: "app-equipe", label: "Equipe", description: "Cadastro de equipe.", type: "blocks", path: "/app/equipe" },
  {
    key: "app-disponibilidade",
    label: "Disponibilidade",
    description: "Horários de atendimento.",
    type: "blocks",
    path: "/app/disponibilidade",
  },
  {
    key: "app-clientes",
    label: "Clientes",
    description: "Lista de clientes.",
    type: "blocks",
    path: "/app/clientes",
  },
  { key: "app-planos", label: "Planos", description: "Planos recorrentes.", type: "blocks", path: "/app/planos" },
  {
    key: "app-financeiro",
    label: "Financeiro",
    description: "Relatórios financeiros.",
    type: "blocks",
    path: "/app/financeiro",
  },
  {
    key: "app-configuracoes",
    label: "Configurações",
    description: "Configurações da loja.",
    type: "blocks",
    path: "/app/configuracoes",
  },
  {
    key: "app-assinatura",
    label: "Assinatura",
    description: "Assinatura da Beloo.",
    type: "blocks",
    path: "/app/assinatura",
  },
  { key: "app-suporte", label: "Suporte", description: "Fale com a Beloo.", type: "blocks", path: "/app/suporte" },
  {
    key: "public-booking",
    label: "Página Pública (Agendamento)",
    description:
      "A vitrine que cada profissional compartilha com os clientes dele — vale para todas ao mesmo tempo.",
    type: "blocks",
    path: "/[slug]",
    // Alvo do preview ao vivo no Editor: "/demo" é a mesma tela, só com
    // dados fictícios (não expõe agenda real de nenhum profissional) — ver
    // src/app/demo/page.tsx.
    previewPath: "/demo",
  },
] as const;

export type PageKey = (typeof EDITABLE_PAGES)[number]["key"];
export type PageType = (typeof EDITABLE_PAGES)[number]["type"];

export function isPageKey(value: string): value is PageKey {
  return EDITABLE_PAGES.some((p) => p.key === value);
}

export function getPageInfo(pageKey: PageKey) {
  return EDITABLE_PAGES.find((p) => p.key === pageKey)!;
}

// Alvo do iframe de preview ao vivo no Editor — igual a `path` pra quase
// toda página; "public-booking" usa "/demo" pra não expor a agenda real de
// nenhum profissional na tela do editor (ver EDITABLE_PAGES acima).
export function getPreviewPath(info: (typeof EDITABLE_PAGES)[number]): string {
  return "previewPath" in info ? info.previewPath : info.path;
}
