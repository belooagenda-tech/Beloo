-- Beloo — pagamento online dos planos que o profissional vende aos próprios
-- clientes. Cartão usa cobrança automática recorrente (Mercado Pago
-- Preapproval); Pix não tem débito automático maduro no Brasil ainda, então
-- é cobrado por ciclo (um link novo por mês), igual ao fluxo de entrada.

alter table public.client_plans
  add column permite_pagamento_online boolean not null default false;

alter table public.client_plan_subs
  add column forma_cobranca text not null default 'manual'
    check (forma_cobranca in ('manual', 'cartao_recorrente', 'pix_ciclico')),
  add column pagamento_status text not null default 'ativo'
    check (pagamento_status in ('pendente', 'ativo', 'atrasado', 'cancelado')),
  add column pagamento_expira_em timestamptz,
  add column mp_preapproval_id text,
  add column mp_preapproval_status text;

-- Histórico de cobranças por ciclo. Não reaproveita appointment_payments
-- (que é unique por appointment_id, então cabe só 1 pagamento por
-- agendamento) — aqui é N linhas por assinatura, uma por ciclo.
create table public.client_plan_payments (
  id uuid primary key default gen_random_uuid(),
  plan_sub_id uuid not null references public.client_plan_subs (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  ciclo_referencia date not null,
  valor numeric(10, 2) not null check (valor >= 0),
  forma_pagamento text not null check (forma_pagamento in ('cartao', 'pix')),
  status text not null check (status in ('pendente', 'pago', 'falhou', 'reembolsado')),
  mp_payment_id text,
  mp_preapproval_id text,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_sub_id, ciclo_referencia)
);

create index client_plan_payments_plan_sub_id_idx on public.client_plan_payments (plan_sub_id);
create index client_plan_payments_business_id_idx on public.client_plan_payments (business_id);

alter table public.client_plan_payments enable row level security;

-- Só o profissional dono do negócio lê o histórico. Escrita é sempre via
-- service role (webhook/cron/Server Actions), então não há policy de
-- insert/update/delete para authenticated/anon.
create policy "client_plan_payments_select_own" on public.client_plan_payments
  for select using (owns_business(business_id));

create trigger client_plan_payments_set_updated_at
  before update on public.client_plan_payments
  for each row
  execute function public.set_updated_at();

-- Notificação de pagamento de plano confirmado (mesma família de
-- entrada_paga, adicionada na migration anterior).
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in ('novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga', 'plano_pago')
  );
