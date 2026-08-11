-- Beloo — lista de espera: quando não há horário disponível no link
-- público, o cliente pode deixar nome/telefone pra ser chamado se abrir uma
-- vaga (cancelamento, novo horário aberto). Sem correspondência automática
-- de propósito — o profissional vê a fila na Agenda e chama manualmente
-- pelo WhatsApp quando tiver um horário livre, evitando a complexidade (e
-- os jeitos de dar errado) de casar automaticamente vaga x pedido.

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  telefone text not null,
  service_id uuid references public.services (id) on delete set null,
  observacao text,
  atendido boolean not null default false,
  created_at timestamptz not null default now()
);

create index waitlist_entries_business_id_idx on public.waitlist_entries (business_id, atendido);

alter table public.waitlist_entries enable row level security;

create policy "waitlist_entries_select_own" on public.waitlist_entries
  for select using (owns_business(business_id));

create policy "waitlist_entries_update_own" on public.waitlist_entries
  for update using (owns_business(business_id)) with check (owns_business(business_id));

-- Sem policy de insert pra "authenticated"/"anon": o cliente entra na fila
-- via Server Action com createAdminClient() (mesmo padrão do resto do
-- booking público), não direto pelo browser.

-- Novo tipo de notificação (sino do profissional) pro aviso de entrada na
-- lista de espera.
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento', 'avaliacao_recebida',
      'lista_espera'
    )
  );
