import { z } from "zod";

// Fontes disponíveis — todas carregadas via next/font em src/app/layout.tsx
// (evita carregar fonte arbitrária em runtime). "cssVar" é a variável CSS que
// o ThemeStyleInjector aponta para --font-sans/--font-heading.
export const THEME_FONT_OPTIONS = [
  { value: "inter", label: "Inter (padrão do corpo)", cssVar: "var(--font-inter)" },
  { value: "poppins", label: "Poppins (padrão dos títulos)", cssVar: "var(--font-poppins)" },
  { value: "manrope", label: "Manrope", cssVar: "var(--font-manrope)" },
  { value: "sora", label: "Sora", cssVar: "var(--font-sora)" },
  { value: "dm-sans", label: "DM Sans", cssVar: "var(--font-dm-sans)" },
] as const;

export type ThemeFontValue = (typeof THEME_FONT_OPTIONS)[number]["value"];
const themeFontValues = THEME_FONT_OPTIONS.map((f) => f.value) as [ThemeFontValue, ...ThemeFontValue[]];

// Opções de raio de borda — conjunto fechado (não é CSS livre).
export const THEME_RADIUS_OPTIONS = [
  { value: "square", label: "Quadrado", rem: "0.25rem" },
  { value: "soft", label: "Levemente arredondado", rem: "0.5rem" },
  { value: "rounded", label: "Arredondado (padrão)", rem: "0.75rem" },
  { value: "pill", label: "Bem arredondado", rem: "1.25rem" },
] as const;

export type ThemeRadiusValue = (typeof THEME_RADIUS_OPTIONS)[number]["value"];
const themeRadiusValues = THEME_RADIUS_OPTIONS.map((r) => r.value) as [ThemeRadiusValue, ...ThemeRadiusValue[]];

export const themeContentSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .optional(),
  headingFont: z.enum(themeFontValues).optional(),
  bodyFont: z.enum(themeFontValues).optional(),
  radius: z.enum(themeRadiusValues).optional(),
});

export type ThemeContent = z.infer<typeof themeContentSchema>;
