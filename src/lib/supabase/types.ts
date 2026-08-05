export type AppointmentStatus =
  | "aguardando_pagamento"
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "nao_compareceu";

export type EntradaStatus = "nao_aplicavel" | "pendente" | "pago" | "reembolsado" | "expirado";

// "entrada_mp" = pago 100% online (Mercado Pago) antes do atendimento;
// "misto" = parte paga online (entrada) + parte cobrada na hora.
export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "debito"
  | "credito"
  | "plano"
  | "entrada_mp"
  | "misto";

export type OrigemPagamento = "avulso" | "plano";

export type TipoExcecao = "folga" | "horario_especial";

export type Profile = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
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
  entrada_ativa: boolean;
  entrada_percentual: number;
  created_at: string;
};

export type MpConnection = {
  business_id: string;
  mp_user_id: string;
  mp_email: string | null;
  access_token: string;
  refresh_token: string;
  public_key: string | null;
  token_expires_at: string | null;
  connected_at: string;
  updated_at: string;
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
  permite_pagamento_online: boolean;
  created_at: string;
};

export type FormaCobranca = "manual" | "cartao_recorrente" | "pix_ciclico";

export type PagamentoStatusPlano = "pendente" | "ativo" | "atrasado" | "cancelado";

export type ClientPlanSub = {
  id: string;
  client_id: string;
  plan_id: string;
  data_inicio: string;
  data_renovacao: string;
  creditos_usados: Record<string, number>;
  ativo: boolean;
  forma_cobranca: FormaCobranca;
  pagamento_status: PagamentoStatusPlano;
  pagamento_expira_em: string | null;
  mp_preapproval_id: string | null;
  mp_preapproval_status: string | null;
  created_at: string;
};

export type ClientPlanPaymentStatus = "pendente" | "pago" | "falhou" | "reembolsado";

export type ClientPlanPayment = {
  id: string;
  plan_sub_id: string;
  business_id: string;
  ciclo_referencia: string;
  valor: number;
  forma_pagamento: "cartao" | "pix";
  status: ClientPlanPaymentStatus;
  mp_payment_id: string | null;
  mp_preapproval_id: string | null;
  pago_em: string | null;
  created_at: string;
  updated_at: string;
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
  client_reminder_sent_at: string | null;
  entrada_status: EntradaStatus;
  entrada_valor: number | null;
  entrada_expira_em: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
};

export type NotificationTipo =
  | "novo_agendamento"
  | "cancelamento"
  | "lembrete_dia"
  | "entrada_paga"
  | "plano_pago";

export type Notification = {
  id: string;
  profile_id: string;
  tipo: NotificationTipo;
  titulo: string;
  corpo: string | null;
  appointment_id: string | null;
  lida: boolean;
  created_at: string;
};

export type AppointmentPayment = {
  id: string;
  appointment_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  origem: OrigemPagamento;
  // Fatia de `valor` que já tinha entrado via entrada online (Mercado Pago)
  // antes da conclusão do atendimento. Null quando não houve entrada.
  entrada_valor: number | null;
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
  valor_mensal: number;
  trial_dias: number;
  billing_enabled: boolean;
  billing_enabled_at: string | null;
  updated_at: string;
};

export type SaasSubscriptionStatus = "trial" | "ativo" | "atrasado" | "cancelado";

export type SaasSubscription = {
  id: string;
  business_id: string;
  status: SaasSubscriptionStatus;
  trial_ends_at: string;
  current_period_end: string | null;
  mp_preapproval_id: string | null;
  mp_preapproval_status: string | null;
  charged_quantity_processed: number;
  created_at: string;
  updated_at: string;
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
      client_plan_payments: Table<ClientPlanPayment>;
      appointments: Table<Appointment>;
      appointment_payments: Table<AppointmentPayment>;
      mp_connections: Table<MpConnection>;
      push_subscriptions: Table<PushSubscriptionRow>;
      saas_plans: Table<SaasPlan>;
      saas_subscriptions: Table<SaasSubscription>;
      notifications: Table<Notification>;
    };
    Views: Record<string, never>;
    Functions: {
      is_slug_available: {
        Args: { candidate_slug: string };
        Returns: boolean;
      };
      replace_business_hours: {
        Args: { p_business_id: string; p_hours: { dia_semana: number; hora_inicio: string; hora_fim: string }[] };
        Returns: undefined;
      };
      complete_appointment_payment: {
        Args: {
          p_appointment_id: string;
          p_valor: number;
          p_forma_pagamento: string;
          p_origem: string;
          p_entrada_valor?: number;
        };
        Returns: { payment_id: string; credito_descontado: boolean }[];
      };
    };
  };
};
