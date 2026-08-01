import { z } from "zod";

export const manualAppointmentSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  telefone: z.string().trim().min(8, "Informe um telefone válido."),
  serviceId: z.string().min(1, "Escolha um serviço."),
  data: z.string().min(1, "Escolha a data."),
  hora: z.string().min(1, "Escolha o horário."),
});

export type ManualAppointmentInput = z.infer<typeof manualAppointmentSchema>;
