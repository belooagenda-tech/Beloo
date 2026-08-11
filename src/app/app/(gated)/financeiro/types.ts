import type { FormaPagamento, OrigemPagamento } from "@/lib/supabase/types";

export type FinancePayment = {
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
  pago_em: string;
};

export type PeriodBucket = {
  chave: string;
  rotulo: string;
  avulso: number;
  plano: number;
};

export type ServiceRevenue = {
  serviceId: string;
  nome: string;
  total: number;
};

export type PaymentMethodRevenue = {
  forma: FormaPagamento;
  label: string;
  total: number;
};

export type ExpiringPlan = {
  subId: string;
  clientId: string;
  clientNome: string;
  clientTelefone: string;
  planNome: string;
  dataRenovacao: string;
};
