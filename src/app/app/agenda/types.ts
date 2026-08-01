import type { AppointmentStatus, FormaPagamento, OrigemPagamento } from "@/lib/supabase/types";

export type AgendaService = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  buffer_min: number | null;
  cor: string | null;
  ativo: boolean;
};

export type AgendaAppointment = {
  id: string;
  client_id: string;
  service_id: string;
  inicio: string;
  fim: string;
  status: AppointmentStatus;
  observacoes: string | null;
};

export type AgendaClient = {
  id: string;
  nome: string;
  telefone: string;
};

export type AgendaPayment = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
};
