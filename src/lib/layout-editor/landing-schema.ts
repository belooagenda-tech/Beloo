import { z } from "zod";
import { ICON_KEYS } from "./icons";

const iconSchema = z.enum(ICON_KEYS);
const id = z.string().min(1).max(64);

export const heroContentSchema = z.object({
  badge: z.string().max(80).optional(),
  headline: z.string().max(160).optional(),
  subtitle: z.string().max(400).optional(),
  cta1Label: z.string().max(60).optional(),
  cta2Label: z.string().max(60).optional(),
});

export const audienceItemSchema = z.object({
  id,
  label: z.string().min(1).max(60),
  icon: iconSchema,
});

export const audienceContentSchema = z.object({
  title: z.string().max(120).optional(),
  subtitle: z.string().max(300).optional(),
  items: z.array(audienceItemSchema).max(12).optional(),
});

export const stepItemSchema = z.object({
  id,
  titulo: z.string().min(1).max(80),
  descricao: z.string().min(1).max(300),
  icon: iconSchema,
});

export const howItWorksContentSchema = z.object({
  title: z.string().max(120).optional(),
  subtitle: z.string().max(300).optional(),
  items: z.array(stepItemSchema).max(8).optional(),
});

export const featureItemSchema = z.object({
  id,
  titulo: z.string().min(1).max(80),
  descricao: z.string().min(1).max(300),
  icon: iconSchema,
});

export const featuresContentSchema = z.object({
  title: z.string().max(120).optional(),
  subtitle: z.string().max(300).optional(),
  items: z.array(featureItemSchema).max(24).optional(),
});

export const ctaContentSchema = z.object({
  headline: z.string().max(160).optional(),
  subtitle: z.string().max(300).optional(),
  buttonLabel: z.string().max(60).optional(),
});

export const tryDemoContentSchema = z.object({
  headline: z.string().max(160).optional(),
  subtitle: z.string().max(300).optional(),
  buttonLabel: z.string().max(60).optional(),
});

export const footerContentSchema = z.object({
  tagline: z.string().max(160).optional(),
});

// Bloco de imagem avulso que o editor pode inserir entre as seções fixas da
// landing — sempre o mesmo template (imagem + legenda opcional), nunca HTML
// livre. `afterSection` decide onde ele entra no fluxo da página.
export const LANDING_SECTION_KEYS = [
  "hero",
  "audience",
  "how-it-works",
  "try-demo",
  "features",
  "cta",
] as const;

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

export const imageBlockSchema = z.object({
  id,
  url: z.string().url(),
  alt: z.string().max(160),
  caption: z.string().max(200).optional(),
  afterSection: z.enum(LANDING_SECTION_KEYS),
});

export const landingContentSchema = z.object({
  hero: heroContentSchema.optional(),
  audience: audienceContentSchema.optional(),
  howItWorks: howItWorksContentSchema.optional(),
  features: featuresContentSchema.optional(),
  cta: ctaContentSchema.optional(),
  tryDemo: tryDemoContentSchema.optional(),
  footer: footerContentSchema.optional(),
  imageBlocks: z.array(imageBlockSchema).max(12).optional(),
});

export type LandingContent = z.infer<typeof landingContentSchema>;
export type AudienceItem = z.infer<typeof audienceItemSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;
export type FeatureItem = z.infer<typeof featureItemSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
