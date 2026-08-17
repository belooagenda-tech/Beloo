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
  instagram_url: string | null;
  google_review_url: string | null;
  whatsapp_lembrete_template: string | null;
  meta_faturamento_mensal: number | null;
  // fbc/fbp do Meta Pixel, capturados no cadastro (criar-agenda) — usados
  // pela Conversions API pra atribuir o evento "Subscribe" (dias depois, via
  // webhook, sem navegador aberto) ao clique no anúncio original.
  meta_fbc: string | null;
  meta_fbp: string | null;
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
  data_nascimento: string | null;
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
  motivo_cancelamento: string | null;
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
  | "plano_pago"
  | "assinatura_expirando"
  | "reagendamento"
  | "avaliacao_recebida"
  | "lista_espera"
  | "novo_profissional"
  | "divulgador_recuperacao_senha";

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

export type AgendaBlock = {
  id: string;
  business_id: string;
  inicio: string;
  fim: string;
  motivo: string | null;
  created_at: string;
};

export type RecurringBlock = {
  id: string;
  business_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  motivo: string | null;
  created_at: string;
};

export type WaitlistEntry = {
  id: string;
  business_id: string;
  nome: string;
  telefone: string;
  service_id: string | null;
  observacao: string | null;
  atendido: boolean;
  created_at: string;
};

export type AppointmentRating = {
  id: string;
  appointment_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
};

// Produtos adicionados a um agendamento — N por agendamento (diferente de
// AppointmentPayment, que é 1:1). nome_snapshot/preco_snapshot preservam o
// que foi vendido mesmo se o produto for editado/apagado depois.
export type AppointmentProduct = {
  id: string;
  appointment_id: string;
  product_id: string | null;
  nome_snapshot: string;
  preco_snapshot: number;
  quantidade: number;
  created_at: string;
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

export type DivulgadorStatus = "ativo" | "inativo";

export type Divulgador = {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  codigo_afiliado: string;
  stripe_account_id: string | null;
  stripe_onboarding_completo: boolean;
  percentual_comissao: number;
  status: DivulgadorStatus;
  criado_em: string;
};

export type DivulgadorSession = {
  id: string;
  divulgador_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export type DivulgadorPasswordReset = {
  id: string;
  divulgador_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type Indicacao = {
  id: string;
  divulgador_id: string;
  profissional_id: string;
  criado_em: string;
};

export type AssinaturaStripe = {
  id: string;
  profissional_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  divulgador_id: string | null;
  criado_em: string;
};

export type ComissaoStatus = "confirmado" | "falhou";

export type ComissaoRegistro = {
  id: string;
  divulgador_id: string;
  profissional_id: string;
  stripe_invoice_id: string;
  valor_assinatura: number;
  percentual_aplicado: number;
  valor_comissao: number;
  status: ComissaoStatus;
  criado_em: string;
};

export type RateLimitHit = {
  chave: string;
  janela: string;
  tentativas: number;
};

export type ErrorLog = {
  id: string;
  scope: string;
  message: string;
  business_id: string | null;
  context: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

// ============================================================================
// Meta Ads (Pixel + Conversions API) — configuração da Beloo (não por-tenant)
// ============================================================================
export type MetaAdsSettings = {
  id: string;
  pixel_id: string | null;
  // Gravado criptografado (ver src/lib/crypto.ts) — nunca lido de volta em
  // texto puro pelo client.
  access_token: string | null;
  test_event_code: string | null;
  tracking_enabled: boolean;
  updated_at: string;
};

export type MetaAdsEventStatus = "success" | "error";

export type MetaAdsEventLog = {
  id: string;
  event_name: string;
  event_id: string | null;
  business_id: string | null;
  status: MetaAdsEventStatus;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
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
      agenda_blocks: Table<AgendaBlock>;
      recurring_blocks: Table<RecurringBlock>;
      appointment_ratings: Table<AppointmentRating>;
      waitlist_entries: Table<WaitlistEntry>;
      products: Table<Product>;
      appointment_products: Table<AppointmentProduct>;
      mp_connections: Table<MpConnection>;
      push_subscriptions: Table<PushSubscriptionRow>;
      saas_plans: Table<SaasPlan>;
      saas_subscriptions: Table<SaasSubscription>;
      notifications: Table<Notification>;
      divulgadores: Table<Divulgador>;
      divulgador_sessions: Table<DivulgadorSession>;
      divulgador_password_resets: Table<DivulgadorPasswordReset>;
      indicacoes: Table<Indicacao>;
      assinaturas_stripe: Table<AssinaturaStripe>;
      comissoes_registro: Table<ComissaoRegistro>;
      rate_limit_hits: Table<RateLimitHit>;
      error_logs: Table<ErrorLog>;
      meta_ads_settings: Table<MetaAdsSettings>;
      meta_ads_events_log: Table<MetaAdsEventLog>;
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
      check_rate_limit: {
        Args: { p_chave: string; p_janela_segundos: number; p_max_tentativas: number };
        Returns: boolean;
      };
      cleanup_old_error_logs: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      cleanup_old_meta_ads_events_log: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      create_public_appointment: {
        Args: {
          p_slug: string;
          p_service_id: string;
          p_inicio: string;
          p_nome: string;
          p_telefone: string;
          p_cobrar_entrada: boolean;
          p_entrada_valor: number | null;
          p_entrada_expira_em: string | null;
          p_max_agendamentos_futuros: number;
          p_produtos?: { product_id: string; quantidade: number }[];
        };
        Returns: {
          appointment_id: string;
          client_id: string;
          client_nome: string;
          business_id: string;
          profile_id: string;
          business_timezone: string;
          service_nome: string;
        };
      };
      cancel_public_appointment: {
        Args: { p_slug: string; p_appointment_id: string; p_telefone: string };
        Returns: {
          appointment_id: string;
          business_id: string;
          profile_id: string;
          business_timezone: string;
          client_nome: string;
          service_id: string;
          service_nome: string | null;
          inicio: string;
          entrada_status: string;
          mp_payment_id: string | null;
        };
      };
      reschedule_public_appointment: {
        Args: {
          p_slug: string;
          p_appointment_id: string;
          p_telefone: string;
          p_novo_inicio: string;
        };
        Returns: {
          appointment_id: string;
          business_id: string;
          profile_id: string;
          business_timezone: string;
          client_nome: string;
          service_id: string;
          service_nome: string | null;
          inicio: string;
        };
      };
      rate_public_appointment: {
        Args: {
          p_slug: string;
          p_appointment_id: string;
          p_telefone: string;
          p_nota: number;
          p_comentario: string | null;
        };
        Returns: {
          appointment_id: string;
          business_id: string;
          profile_id: string;
          client_nome: string;
          service_nome: string | null;
          nota: number;
          comentario: string | null;
        };
      };
    };
  };
};
