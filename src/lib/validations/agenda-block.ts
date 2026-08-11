import { z } from "zod";

export const agendaBlockSchema = z
  .object({
    data: z.string().min(1, "Escolha a data."),
    horaInicio: z.string().min(1, "Escolha o horário de início."),
    horaFim: z.string().min(1, "Escolha o horário de término."),
    motivo: z.string().trim().max(120, "Máximo de 120 caracteres.").optional(),
  })
  .refine((v) => v.horaFim > v.horaInicio, {
    message: "O horário de término precisa ser depois do início.",
    path: ["horaFim"],
  });

export type AgendaBlockInput = z.infer<typeof agendaBlockSchema>;
