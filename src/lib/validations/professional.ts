import { z } from "zod";

export const professionalSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome para o profissional."),
});

export type ProfessionalInput = z.infer<typeof professionalSchema>;
