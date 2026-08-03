import { z } from "zod";
import { isValidBrazilianPhone } from "@/lib/phone";

export const clientInfoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  telefone: z
    .string()
    .trim()
    .refine(isValidBrazilianPhone, "Informe um WhatsApp válido com DDD."),
  // Campo-armadilha: invisível para pessoas, mas formulários preenchidos por
  // bots costumam preencher todo campo que encontram. Se vier preenchido,
  // tratamos como spam.
  empresa: z.string().optional(),
});

export type ClientInfoInput = z.infer<typeof clientInfoSchema>;
