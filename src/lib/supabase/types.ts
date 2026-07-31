export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "nao_compareceu";

export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "plano";

export type OrigemPagamento = "avulso" | "plano";

export type TipoExcecao = "folga" | "horario_especial";

export type Profile = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Business = {
  id: string;
  profile_id: string;
  nome_loja: string;
  slug: string;
  categoria: string | null;
  logo_url: string | null;
  timezone: string;
  antecedencia_minima_min: number;
  limite_dias_futuro: number;
  cancelamento_min_horas: number;
  buffer_padrao_min: number;
  created_at: string;
};

export type BusinessHour = {
  id: string;
  business_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type BusinessException = {
  id: string;
  business_id: string;
  data: string;
  tipo: TipoExcecao;
  hora_inicio: string | null;
  hora_fim: string | null;
};

export type Service = {
  id: string;
  business_id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  buffer_min: number | null;
  cor: string | null;
  ativo: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  business_id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  criado_em: string;
};

export type ClientPlan = {
  id: string;
  business_id: string;
  nome: string;
  valor_mensal: number;
  servicos_inclusos: { service_id: string; quantidade: number | null }[];
  ciclo_dias: number;
  ativo: boolean;
  created_at: string;
};

export type ClientPlanSub = {
  id: string;
  client_id: string;
  plan_id: string;
  data_inicio: string;
  data_renovacao: string;
  creditos_usados: Record<string, number>;
  ativo: boolean;
  created_at: string;
};

export type Appointment = {
  id: string;
  business_id: string;
  client_id: string;
  service_id: string;
  inicio: string;
  fim: string;
  status: AppointmentStatus;
  observacoes: string | null;
  created_at: string;
};

export type AppointmentPayment = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
  pago_em: string;
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  profile_id: string | null;
  client_id: string | null;
  endpoint: string;
  keys: Record<string, string>;
  created_at: string;
};

export type SaasPlan = {
  id: string;
  nome: string;
  status: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      businesses: Table<Business>;
      business_hours: Table<BusinessHour>;
      business_exceptions: Table<BusinessException>;
      services: Table<Service>;
      clients: Table<Client>;
      client_plans: Table<ClientPlan>;
      client_plan_subs: Table<ClientPlanSub>;
      appointments: Table<Appointment>;
      appointment_payments: Table<AppointmentPayment>;
      push_subscriptions: Table<PushSubscriptionRow>;
      saas_plans: Table<SaasPlan>;
    };
    Views: Record<string, never>;
    Functions: {
      is_slug_available: {
        Args: { candidate_slug: string };
        Returns: boolean;
      };
    };
  };
};
