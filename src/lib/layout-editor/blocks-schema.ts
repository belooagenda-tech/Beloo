import { z } from "zod";

// Modelo genérico de "blocos avulsos" usado pelas 13 telas internas do app
// (ver EDITABLE_PAGES em pages.ts) — o editor insere texto ou imagem antes
// ou depois do conteúdo funcional da página (tabela, agenda, formulário),
// mas nunca dentro dele. Sempre um destes dois templates, nunca HTML livre.
const id = z.string().min(1).max(64);
const position = z.enum(["before", "after"]);

export const textBlockSchema = z.object({
  id,
  type: z.literal("text"),
  position,
  heading: z.string().max(120).optional(),
  body: z.string().min(1).max(1000),
});

export const imageBlockSchema = z.object({
  id,
  type: z.literal("image"),
  position,
  url: z.string().url(),
  alt: z.string().max(160),
  caption: z.string().max(200).optional(),
});

export const customBlockSchema = z.discriminatedUnion("type", [textBlockSchema, imageBlockSchema]);

export const blocksContentSchema = z.object({
  blocks: z.array(customBlockSchema).max(20).optional(),
});

export type CustomBlock = z.infer<typeof customBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ImageBlockBlock = z.infer<typeof imageBlockSchema>;
export type BlocksContent = z.infer<typeof blocksContentSchema>;
export type BlockPosition = z.infer<typeof position>;
