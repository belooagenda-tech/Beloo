import { z } from "zod";
import { isValidBrazilianPhone } from "@/lib/phone";

export const clientInfoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: z
    .string()
    .trim()
    .refine(isValidBrazilianPhone, "Informe um WhatsApp válido com DDD."),
});

export type ClientInfoInput = z.infer<typeof clientInfoSchema>;
