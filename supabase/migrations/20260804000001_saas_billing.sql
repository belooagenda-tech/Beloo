-- Beloo — cobrança da própria plataforma aos profissionais
-- (não confundir com client_plans/client_plan_subs, que é o profissional
-- cobrando os próprios clientes).

-- ============================================================================
-- profiles.is_admin — sinaliza o dono da Beloo (acesso ao /app/admin, nunca
-- bloqueado por falta de pagamento).
-- ============================================================================
alter table public.profiles add column is_admin boolean not null default false;

update public.profiles set is_admin = true where email = 'gabrielcogabriel93@gmail.com';

-- ============================================================================
-- saas_plans — deixa de ser só um placeholder: ganha preço, dias de trial e
-- o interruptor "Ativar cobrança" controlado pelo admin.
-- ============================================================================
alter table public.saas_plans add column valor_mensal numeric(10, 2) not null default 49.90;
alter table public.saas_plans add column trial_dias integer not null default 7;
alter table public.saas_plans add column billing_enabled boolean not null default false;
alter table public.saas_plans add column billing_enabled_at timestamptz;
alter table public.saas_plans add column updated_at timestamptz not null default now();

-- Garante que existe pelo menos 1 linha — o trigger de trial abaixo depende
-- de ler trial_dias daqui. Em produção o seed.sql (que cria essa linha) só
-- roda localmente, então essa tabela pode estar vazia neste ponto.
insert into public.saas_plans (nome, status)
select 'Beloo Pro', 'ativo'
where not exists (select 1 from public.saas_plans);

create trigger saas_plans_set_updated_at
  before update on public.saas_plans
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- saas_subscriptions — status da assinatura da Beloo por negócio (1:1 com
-- businesses). Toda business nova ganha uma linha em trial automaticamente.
-- ============================================================================
create table public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'ativo', 'atrasado', 'cancelado')),
  trial_ends_at timestamptz not null,
  current_period_end timestamptz,
  mp_preapproval_id text,
  mp_preapproval_status text,
  charged_quantity_processed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saas_subscriptions_set_updated_at
  before update on public.saas_subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.saas_subscriptions enable row level security;

create policy "saas_subscriptions_select_own" on public.saas_subscriptions
  for select using (owns_business(business_id));

-- Sem policy de insert/update/delete para "authenticated" — essas escritas só
-- acontecem via createAdminClient() (trigger, webhook, actions do admin),
-- igual ao resto do projeto.

-- ============================================================================
-- Toda business nova ganha uma saas_subscription em trial automaticamente
-- (mesmo padrão do handle_new_user() em auth.users).
-- ============================================================================
create function public.handle_new_business_saas_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.saas_subscriptions (business_id, status, trial_ends_at)
  values (
    new.id,
    'trial',
    now() + (select trial_dias from public.saas_plans limit 1) * interval '1 day'
  );
  return new;
end;
$$;

create trigger on_business_created_saas_subscription
  after insert on public.businesses
  for each row
  execute function public.handle_new_business_saas_subscription();

-- Backfill para as businesses já existentes.
insert into public.saas_subscriptions (business_id, status, trial_ends_at)
select
  b.id,
  'trial',
  now() + (select trial_dias from public.saas_plans limit 1) * interval '1 day'
from public.businesses b
where not exists (
  select 1 from public.saas_subscriptions s where s.business_id = b.id
);
