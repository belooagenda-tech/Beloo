import type {
  AppointmentStatus,
  EntradaStatus,
  FormaPagamento,
  OrigemPagamento,
} from "@/lib/supabase/types";

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
  entrada_status: EntradaStatus;
  entrada_valor: number | null;
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
  entrada_valor: number | null;
};

// Plano ativo do cliente (no máx. 1 por cliente) — carregado junto com a
// Agenda pra mostrar "esse cliente tem plano tal" direto no card, sem
// esperar o profissional abrir "Concluir e receber" pra descobrir.
export type AgendaClientPlan = {
  clientId: string;
  planoNome: string;
  creditosUsados: Record<string, number>;
  servicosInclusos: { service_id: string; quantidade: number | null }[];
};
