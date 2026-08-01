import { z } from "zod";

export const clientSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  telefone: z.string().trim().min(8, "Informe um telefone válido."),
  observacoes: z.string().trim().max(2000, "Máximo de 2000 caracteres.").optional(),
});

export type ClientFormInput = z.infer<typeof clientSchema>;
