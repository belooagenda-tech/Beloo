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
  // Quem da equipe atende — null quando a loja não usa a aba Equipe ou o
  // serviço ainda não tem ninguém vinculado.
  professional_id: string | null;
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

export type AgendaProfessional = {
  id: string;
  nome: string;
  foto_url: string | null;
  cor: string | null;
  ativo: boolean;
};

export type AgendaPayment = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
  entrada_valor: number | null;
};

// Produtos vendidos junto com um agendamento (via vitrine pública) — N por
// agendamento, exibidos no card e somados ao sugerir o valor a cobrar na
// conclusão.
export type AgendaProduct = {
  id: string;
  appointment_id: string;
  nome_snapshot: string;
  preco_snapshot: number;
  quantidade: number;
};

// Bloqueio pontual de horário criado direto na Agenda (ex.: almoço) — mesma
// tabela `agenda_blocks` também é considerada como ocupado no cálculo de
// horários livres do agendamento público (ver lib/booking/get-available-slots.ts).
export type AgendaBlock = {
  id: string;
  // null bloqueia a loja inteira; preenchido bloqueia só esse profissional.
  professional_id: string | null;
  inicio: string;
  fim: string;
  motivo: string | null;
};

// Item unificado do dia (agendamento OU bloqueio), usado tanto pela lista
// quanto pela grade horária pra renderizar tudo junto, ordenado por horário.
export type AgendaDayItem =
  | { kind: "appointment"; inicio: string; appointment: AgendaAppointment }
  | { kind: "block"; inicio: string; block: AgendaBlock };

// Plano ativo do cliente (no máx. 1 por cliente) — carregado junto com a
// Agenda pra mostrar "esse cliente tem plano tal" direto no card, sem
// esperar o profissional abrir "Concluir e receber" pra descobrir.
export type AgendaClientPlan = {
  clientId: string;
  planoNome: string;
  creditosUsados: Record<string, number>;
  servicosInclusos: { service_id: string; quantidade: number | null }[];
};
