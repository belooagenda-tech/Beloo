-- Beloo — entrada (depósito) opcional no agendamento público + conexão
-- Mercado Pago (OAuth) por profissional, para receber o valor diretamente
-- na própria conta.

-- ============================================================================
-- businesses — configuração de entrada
-- ============================================================================
alter table public.businesses
  add column entrada_ativa boolean not null default false,
  add column entrada_percentual smallint not null default 0
    check (entrada_percentual between 0 and 100);

-- ============================================================================
-- mp_connections — tokens OAuth do Mercado Pago por loja.
-- RLS habilitado SEM nenhuma policy: nem o próprio dono da loja consegue ler
-- esta tabela pelo client anon/authenticated — só o service role (usado nas
-- Server Actions e rotas de API via createAdminClient()) tem acesso.
-- ============================================================================
create table public.mp_connections (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  mp_user_id text not null,
  mp_email text,
  access_token text not null,
  refresh_token text not null,
  public_key text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mp_connections enable row level security;

create trigger mp_connections_set_updated_at
  before update on public.mp_connections
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- appointments — novo status de espera de pagamento + rastreio da entrada
-- ============================================================================
alter table public.appointments drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check check (
    status in (
      'aguardando_pagamento', 'agendado', 'confirmado',
      'concluido', 'cancelado', 'nao_compareceu'
    )
  );

alter table public.appointments
  add column entrada_status text not null default 'nao_aplicavel'
    check (entrada_status in ('nao_aplicavel', 'pendente', 'pago', 'reembolsado', 'expirado')),
  add column entrada_valor numeric(10, 2),
  add column entrada_expira_em timestamptz,
  add column mp_payment_id text,
  add column mp_preference_id text;

-- A exclusão de sobreposição (appointments_no_overlap, definida no schema
-- inicial) já usa `where (status <> 'cancelado')`, então um agendamento
-- 'aguardando_pagamento' continua ocupando o horário normalmente — nenhuma
-- alteração necessária nela.

-- ============================================================================
-- notifications — novo tipo para entrada confirmada
-- ============================================================================
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in ('novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga')
  );
