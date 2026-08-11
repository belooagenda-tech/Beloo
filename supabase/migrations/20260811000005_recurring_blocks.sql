-- Beloo — bloqueio de horário recorrente (ex.: toda segunda-feira de manhã),
-- configurado em Disponibilidade. Diferente de agenda_blocks (pontual, um
-- dia específico) e de business_hours (horário que fica ABERTO) — aqui é um
-- intervalo que fica FECHADO toda semana, dentro de um dia normalmente
-- aberto. O motor de disponibilidade pública (computeAvailableSlots) passa a
-- excluir esses intervalos de todo dia que bater o dia da semana.

create table public.recurring_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  motivo text,
  created_at timestamptz not null default now(),
  constraint recurring_blocks_hora_fim_maior check (hora_fim > hora_inicio)
);

create index recurring_blocks_business_id_idx on public.recurring_blocks (business_id);

alter table public.recurring_blocks enable row level security;

create policy "recurring_blocks_select_own" on public.recurring_blocks
  for select using (owns_business(business_id));

create policy "recurring_blocks_insert_own" on public.recurring_blocks
  for insert with check (owns_business(business_id));

create policy "recurring_blocks_delete_own" on public.recurring_blocks
  for delete using (owns_business(business_id));
