import type { FormaPagamento } from "@/lib/supabase/types";

export const COR_AVULSO = "var(--chart-1)";
export const COR_PLANO = "var(--chart-2)";

export const COR_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: "var(--chart-1)",
  pix: "var(--chart-2)",
  debito: "var(--chart-3)",
  credito: "var(--chart-4)",
  plano: "var(--chart-5)",
  entrada_mp: "var(--chart-2)",
  misto: "var(--chart-3)",
};
