import { z } from "zod";

export const serviceSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome para o serviço."),
  duracaoMin: z
    .number()
    .int()
    .min(5, "A duração mínima é 5 minutos.")
    .max(600, "A duração máxima é 600 minutos."),
  preco: z.number().min(0, "O preço não pode ser negativo."),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
