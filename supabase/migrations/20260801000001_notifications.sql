-- Beloo — notificações in-app (sino) para o profissional, usadas como
-- fallback para quando push não está disponível/autorizado, e como
-- histórico mesmo para quem tem push ativo.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('novo_agendamento', 'cancelamento', 'lembrete_dia')),
  titulo text not null,
  corpo text,
  appointment_id uuid references public.appointments (id) on delete set null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_id_idx on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

-- Sem policy de insert: só o service role (usado pelas Server Actions e
-- pelo cron de lembretes) grava notificações. O profissional só lê/marca
-- como lida as suas.
create policy "notifications_select_own" on public.notifications
  for select using (profile_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Controle de idempotência do lembrete enviado ao cliente antes do horário.
alter table public.appointments
  add column client_reminder_sent_at timestamptz;
