import { z } from "zod";

export const planSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome para o plano."),
  valorMensal: z.number().min(0, "O valor não pode ser negativo."),
  cicloDias: z.number().int().min(1, "O ciclo precisa ter pelo menos 1 dia.").max(365),
});

export type PlanInput = z.infer<typeof planSchema>;

export type ServicoIncluso = {
  serviceId: string;
  ilimitado: boolean;
  quantidade: number;
};
