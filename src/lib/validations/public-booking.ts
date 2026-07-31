import { z } from "zod";

export const clientInfoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: z.string().trim().min(8, "Informe um WhatsApp válido com DDD."),
});

export type ClientInfoInput = z.infer<typeof clientInfoSchema>;
