import type { AppointmentStatus, FormaPagamento, OrigemPagamento } from "@/lib/supabase/types";

export type ClientDetail = {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  criado_em: string;
};

export type HistoryAppointment = {
  id: string;
  service_id: string;
  inicio: string;
  fim: string;
  status: AppointmentStatus;
};

export type HistoryPayment = {
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
};

export type ServiceLookup = { id: string; nome: string };

export type ActivePlan = {
  subId: string;
  planNome: string;
  dataRenovacao: string;
  cicloDias: number;
  itens: { serviceId: string; serviceNome: string; usados: number; limite: number | null }[];
};
