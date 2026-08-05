import type { FormaPagamento } from "@/lib/supabase/types";

// Rótulos usados em qualquer lugar que exiba appointment_payments.forma_pagamento
// (Agenda, Financeiro, histórico do cliente) — centralizados para não divergir
// entre telas, principalmente para os valores de entrada online.
export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  plano: "Plano",
  entrada_mp: "Pago online",
  misto: "Entrada online + presencial",
};
