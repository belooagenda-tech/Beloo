import { z } from "zod";
import { CATEGORIAS } from "@/lib/constants";
import { isValidBrazilianPhone } from "@/lib/phone";

const categoriaValues = CATEGORIAS.map((c) => c.value) as [string, ...string[]];

export const accountSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: z
    .string()
    .trim()
    .refine(isValidBrazilianPhone, "Informe um telefone válido com DDD."),
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export type AccountInput = z.infer<typeof accountSchema>;

export const storeSchema = z.object({
  nomeLoja: z.string().trim().min(2, "Dê um nome para sua loja ou marca."),
  slug: z
    .string()
    .trim()
    .min(3, "O link precisa ter pelo menos 3 caracteres.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífen."),
});

export type StoreInput = z.infer<typeof storeSchema>;

export const categorySchema = z.object({
  categoria: z.enum(categoriaValues),
});

export type CategoryInput = z.infer<typeof categorySchema>;

const blocoSchema = z
  .object({
    inicio: z.string().regex(/^\d{2}:\d{2}$/),
    fim: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((b) => b.fim > b.inicio, {
    message: "O horário final precisa ser depois do inicial.",
    path: ["fim"],
  });

export const availabilitySchema = z.object({
  dias: z.array(
    z.object({
      diaSemana: z.number().min(0).max(6),
      ativo: z.boolean(),
      blocos: z.array(blocoSchema),
    }),
  ),
  antecedenciaMinutos: z.coerce.number().min(0).max(10080),
  limiteDias: z.coerce.number().min(1).max(365),
});

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
