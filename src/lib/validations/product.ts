import { z } from "zod";

export const productSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome para o produto."),
  descricao: z.string().trim().max(300, "Descrição muito longa.").optional(),
  preco: z.number().min(0, "O preço não pode ser negativo."),
});

export type ProductInput = z.infer<typeof productSchema>;
