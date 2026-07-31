-- Beloo — schema inicial
-- Tabelas de negócio, todas ligadas (direta ou indiretamente) a um business_id.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============================================================================
-- profiles — um registro por usuário autenticado (dono de agenda)
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- businesses — a "loja"/agenda do profissional (MVP: 1 por profile)
-- ============================================================================
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  nome_loja text not null,
  slug text not null unique,
  categoria text,
  logo_url text,
  timezone text not null default 'America/Sao_Paulo',
  antecedencia_minima_min integer not null default 60,
  limite_dias_futuro integer not null default 30,
  cancelamento_min_horas integer not null default 2,
  buffer_padrao_min integer not null default 0,
  created_at timestamptz not null default now(),
  constraint slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index businesses_profile_id_idx on public.businesses (profile_id);

-- ============================================================================
-- business_hours — blocos de disponibilidade recorrentes por dia da semana
-- ============================================================================
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fim time not null,
  constraint hora_fim_maior check (hora_fim > hora_inicio)
);

create index business_hours_business_id_idx on public.business_hours (business_id);

-- ============================================================================
-- business_exceptions — folgas ou horários especiais numa data específica
-- ============================================================================
create table public.business_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('folga', 'horario_especial')),
  hora_inicio time,
  hora_fim time,
  constraint horario_especial_tem_horas check (
    tipo = 'folga' or (hora_inicio is not null and hora_fim is not null and hora_fim > hora_inicio)
  )
);

create index business_exceptions_business_id_idx on public.business_exceptions (business_id);
create unique index business_exceptions_unique_data on public.business_exceptions (business_id, data);

-- ============================================================================
-- services — serviços oferecidos pela loja
-- ============================================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  duracao_min integer not null check (duracao_min > 0),
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  buffer_min integer check (buffer_min >= 0),
  cor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_business_id_idx on public.services (business_id);

-- ============================================================================
-- clients — clientes de uma loja (criados no primeiro agendamento ou manualmente)
-- ============================================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  telefone text not null,
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (business_id, telefone)
);

create index clients_business_id_idx on public.clients (business_id);

-- ============================================================================
-- client_plans — planos recorrentes que O PROFISSIONAL vende para seus clientes
-- ============================================================================
create table public.client_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  valor_mensal numeric(10, 2) not null check (valor_mensal >= 0),
  servicos_inclusos jsonb not null default '[]'::jsonb, -- [{ "service_id": uuid, "quantidade": int|null }]
  ciclo_dias integer not null default 30 check (ciclo_dias > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index client_plans_business_id_idx on public.client_plans (business_id);

-- ============================================================================
-- client_plan_subs — assinatura de um cliente a um plano (1 ativa por cliente)
-- ============================================================================
create table public.client_plan_subs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  plan_id uuid not null references public.client_plans (id) on delete cascade,
  data_inicio date not null default current_date,
  data_renovacao date not null,
  creditos_usados jsonb not null default '{}'::jsonb, -- { "<service_id>": count }
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index client_plan_subs_client_id_idx on public.client_plan_subs (client_id);
create index client_plan_subs_plan_id_idx on public.client_plan_subs (plan_id);
-- Regra: um cliente só pode ter um plano ativo por vez.
create unique index client_plan_subs_one_active_per_client
  on public.client_plan_subs (client_id)
  where (ativo);

-- ============================================================================
-- appointments — agendamentos
-- ============================================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  service_id uuid not null references public.services (id),
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu')),
  observacoes text,
  created_at timestamptz not null default now(),
  constraint fim_maior_que_inicio check (fim > inicio)
);

create index appointments_business_id_idx on public.appointments (business_id);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_inicio_idx on public.appointments (business_id, inicio);

-- Nunca permitir sobreposição de horários dentro da mesma loja
-- (ignora agendamentos cancelados, que não ocupam mais o horário).
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(inicio, fim) with &&
  )
  where (status <> 'cancelado');

-- ============================================================================
-- appointment_payments — no máximo 1 registro de pagamento por agendamento
-- ============================================================================
create table public.appointment_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  valor numeric(10, 2) not null default 0 check (valor >= 0),
  forma_pagamento text not null
    check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito', 'plano')),
  origem text not null check (origem in ('avulso', 'plano')),
  pago_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- push_subscriptions — Web Push (VAPID) para profissional ou cliente
-- ============================================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  constraint push_subscription_owner check (
    (profile_id is not null and client_id is null) or
    (profile_id is null and client_id is not null)
  )
);

-- ============================================================================
-- saas_plans — placeholder para os planos de assinatura do próprio Beloo
-- ============================================================================
create table public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'em_breve'
);

-- ============================================================================
-- updated_at automático em appointment_payments
-- ============================================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointment_payments_set_updated_at
  before update on public.appointment_payments
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- profiles é criado automaticamente quando um usuário se cadastra no Supabase Auth
-- ============================================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'telefone',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
