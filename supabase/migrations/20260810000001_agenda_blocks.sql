-- Beloo — bloqueios pontuais de horário na Agenda
-- Complementa business_exceptions (folga/horário especial do DIA INTEIRO):
-- aqui é um intervalo específico dentro de um dia normalmente aberto (ex.:
-- almoço, compromisso pessoal), criado direto da tela de Agenda, sem precisar
-- passar por Disponibilidade. Os horários de agendamento público (RPC
-- create_public_appointment / getAvailableSlotsForService) passam a
-- considerar esses intervalos como ocupados, igual já fazem com appointments.

create table public.agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  created_at timestamptz not null default now(),
  constraint agenda_blocks_fim_maior_que_inicio check (fim > inicio)
);

create index agenda_blocks_business_id_idx on public.agenda_blocks (business_id, inicio);

alter table public.agenda_blocks enable row level security;

create policy "agenda_blocks_select_own" on public.agenda_blocks
  for select using (owns_business(business_id));

create policy "agenda_blocks_insert_own" on public.agenda_blocks
  for insert with check (owns_business(business_id));

create policy "agenda_blocks_update_own" on public.agenda_blocks
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "agenda_blocks_delete_own" on public.agenda_blocks
  for delete using (owns_business(business_id));
