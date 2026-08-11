import type {
  AppointmentStatus,
  FormaCobranca,
  FormaPagamento,
  OrigemPagamento,
  PagamentoStatusPlano,
} from "@/lib/supabase/types";

export type ClientDetail = {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  data_nascimento: string | null;
  criado_em: string;
};

export type HistoryAppointment = {
  id: string;
  service_id: string;
  inicio: string;
  fim: string;
  status: AppointmentStatus;
  motivo_cancelamento: string | null;
};

export type HistoryPayment = {
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
  entrada_valor: number | null;
};

export type ServiceLookup = { id: string; nome: string };

export type ActivePlan = {
  subId: string;
  planNome: string;
  dataRenovacao: string;
  cicloDias: number;
  itens: { serviceId: string; serviceNome: string; usados: number; limite: number | null }[];
  formaCobranca: FormaCobranca;
  pagamentoStatus: PagamentoStatusPlano;
};

export type AvailablePlan = {
  id: string;
  nome: string;
  valor_mensal: number;
  ciclo_dias: number;
  permite_pagamento_online: boolean;
};

export type ClientRating = {
  id: string;
  appointmentId: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
};

export type PlanPaymentHistoryItem = {
  id: string;
  ciclo_referencia: string;
  valor: number;
  forma_pagamento: "cartao" | "pix";
  status: "pendente" | "pago" | "falhou" | "reembolsado";
  pago_em: string | null;
};
