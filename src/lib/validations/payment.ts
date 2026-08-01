import { z } from "zod";

export const avulsoPaymentSchema = z.object({
  valor: z.number().min(0, "O valor não pode ser negativo."),
  formaPagamento: z.enum(["dinheiro", "pix", "debito", "credito"], {
    error: "Escolha a forma de pagamento.",
  }),
});

export type AvulsoPaymentInput = z.infer<typeof avulsoPaymentSchema>;
