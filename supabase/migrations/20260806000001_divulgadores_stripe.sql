-- Beloo — sistema de comissões recorrentes para divulgadores (afiliados) via
-- Stripe Connect + Stripe Billing. Roda em paralelo ao que já existe: NENHUMA
-- tabela existente é alterada. A cobrança da assinatura Beloo continua tendo
-- saas_plans/saas_subscriptions como fonte da verdade pro gating de acesso
-- (src/app/app/(gated)/layout.tsx) — essas tabelas novas só guardam o que é
-- específico da Stripe/dos divulgadores.
--
-- Autenticação do divulgador é própria (não usa Supabase Auth, não usa
-- profiles/businesses) — daí divulgador_sessions, que não estava no desenho
-- original mas é necessária pra ter login/logout de verdade.
--
-- Todas as tabelas ficam com RLS habilitado e SEM nenhuma policy: mesmo
-- padrão já usado em mp_connections — só o service role (via
-- createAdminClient() nas Server Actions/rotas) acessa. Autorização é feita
-- na aplicação, não no banco.

-- ============================================================================
-- divulgadores
-- ============================================================================
create table public.divulgadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  senha_hash text not null,
  codigo_afiliado text not null unique,
  stripe_account_id text,
  stripe_onboarding_completo boolean not null default false,
  percentual_comissao numeric(5, 2) not null default 10
    check (percentual_comissao >= 0 and percentual_comissao <= 100),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  criado_em timestamptz not null default now()
);

create unique index divulgadores_email_lower_idx on public.divulgadores (lower(email));

alter table public.divulgadores enable row level security;

-- ============================================================================
-- divulgador_sessions — sessão de login própria do divulgador (cookie guarda
-- só o token em texto puro; aqui fica o hash, pra permitir logout/revogação
-- de verdade em vez de um cookie assinado sem estado no servidor).
-- ============================================================================
create table public.divulgador_sessions (
  id uuid primary key default gen_random_uuid(),
  divulgador_id uuid not null references public.divulgadores (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index divulgador_sessions_divulgador_id_idx on public.divulgador_sessions (divulgador_id);

alter table public.divulgador_sessions enable row level security;

-- ============================================================================
-- indicacoes — vínculo divulgador ↔ profissional. Um profissional só pode
-- ter UM divulgador (unique em profissional_id) e o vínculo nunca é
-- atualizado/apagado pela aplicação depois de criado — imutável na prática.
-- ============================================================================
create table public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  divulgador_id uuid not null references public.divulgadores (id) on delete cascade,
  profissional_id uuid not null unique references public.businesses (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index indicacoes_divulgador_id_idx on public.indicacoes (divulgador_id);

alter table public.indicacoes enable row level security;

-- ============================================================================
-- assinaturas_stripe — mapeamento da assinatura Beloo (SaaS) cobrada via
-- Stripe. Só existe para negócios que assinaram pelo Stripe — quem já paga
-- via Mercado Pago (mp_preapproval_id em saas_subscriptions) nunca tem linha
-- aqui. divulgador_id nullable: preenchido só quando veio de indicação.
-- ============================================================================
create table public.assinaturas_stripe (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null unique references public.businesses (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  divulgador_id uuid references public.divulgadores (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index assinaturas_stripe_divulgador_id_idx on public.assinaturas_stripe (divulgador_id);

alter table public.assinaturas_stripe enable row level security;

-- ============================================================================
-- comissoes_registro — espelho local do que a Stripe já processou (ela quem
-- faz o split de verdade via application_fee_amount); isso aqui é só pra
-- relatório no painel do divulgador/admin. stripe_invoice_id único garante
-- idempotência: reentrega do webhook não duplica comissão.
-- ============================================================================
create table public.comissoes_registro (
  id uuid primary key default gen_random_uuid(),
  divulgador_id uuid not null references public.divulgadores (id) on delete cascade,
  profissional_id uuid not null references public.businesses (id) on delete cascade,
  stripe_invoice_id text not null unique,
  valor_assinatura numeric(10, 2) not null,
  percentual_aplicado numeric(5, 2) not null,
  valor_comissao numeric(10, 2) not null,
  status text not null default 'confirmado' check (status in ('confirmado', 'falhou')),
  criado_em timestamptz not null default now()
);

create index comissoes_registro_divulgador_id_idx on public.comissoes_registro (divulgador_id);

alter table public.comissoes_registro enable row level security;
