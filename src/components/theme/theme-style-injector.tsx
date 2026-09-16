import { getPublishedTheme } from "@/lib/layout-editor/get-published";
import { THEME_FONT_OPTIONS, THEME_RADIUS_OPTIONS } from "@/lib/layout-editor/theme-schema";
import { deriveThemeColors } from "@/lib/layout-editor/color";

// Server Component que injeta os overrides do Tema Global (publicados pelo
// Editor Visual) como variáveis CSS em :root — sem tocar em nenhum
// componente funcional. Sem tema publicado ainda (`{}`), não renderiza nada
// e o visual de hoje (globals.css) continua intacto. Ver
// src/lib/layout-editor/get-published.ts e supabase/migrations/20260916000001_layout_editor.sql.
export async function ThemeStyleInjector() {
  const theme = await getPublishedTheme();

  const declarations: string[] = [];

  if (theme.primaryColor) {
    const derived = deriveThemeColors(theme.primaryColor);
    declarations.push(
      `--primary: ${derived.primary};`,
      `--primary-strong: ${derived.primaryStrong};`,
      `--secondary: ${derived.secondary};`,
      `--secondary-foreground: ${derived.secondaryForeground};`,
      `--ring: ${derived.ring};`,
      `--sidebar-primary: ${derived.primary};`,
      `--sidebar-ring: ${derived.ring};`,
      `--sidebar-accent: ${derived.secondary};`,
      `--sidebar-accent-foreground: ${derived.secondaryForeground};`,
    );
  }

  // Sobrescreve --font-sans/--font-heading diretamente (não --font-inter/
  // --font-poppins, que são as variáveis "cruas" do next/font) — são essas
  // duas que as classes utilitárias font-sans/font-heading e o `html`/`h1..h6`
  // de globals.css realmente consomem, então funciona independente da ordem
  // de carregamento do stylesheet gerado pelo next/font.
  if (theme.bodyFont) {
    const font = THEME_FONT_OPTIONS.find((f) => f.value === theme.bodyFont);
    if (font) declarations.push(`--font-sans: ${font.cssVar};`);
  }

  if (theme.headingFont) {
    const font = THEME_FONT_OPTIONS.find((f) => f.value === theme.headingFont);
    if (font) declarations.push(`--font-heading: ${font.cssVar};`);
  }

  if (theme.radius) {
    const radius = THEME_RADIUS_OPTIONS.find((r) => r.value === theme.radius);
    if (radius) declarations.push(`--radius: ${radius.rem};`);
  }

  if (declarations.length === 0) return null;

  return <style id="layout-editor-theme">{`:root { ${declarations.join(" ")} }`}</style>;
}
