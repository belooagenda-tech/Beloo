-- Beloo — aba Suporte: o profissional manda sugestão/dúvida direto pro
-- dono da Beloo, que recebe notificação (sino + push) na hora, igual ao
-- aviso de "novo profissional" já existente.

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index support_messages_business_id_idx on public.support_messages (business_id, created_at desc);

alter table public.support_messages enable row level security;

create policy "support_messages_select_own" on public.support_messages
  for select using (owns_business(business_id));

create policy "support_messages_insert_own" on public.support_messages
  for insert with check (owns_business(business_id));

-- Sem policy de update pro profissional: só o Admin marca como lida, sempre
-- via createAdminClient() (bypassa RLS), mesmo padrão de error_logs.resolved.

alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento', 'avaliacao_recebida',
      'lista_espera', 'novo_profissional', 'divulgador_recuperacao_senha',
      'mensagem_suporte'
    )
  );
