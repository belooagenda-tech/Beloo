-- Beloo — recuperação de senha do divulgador (autenticação própria, não usa
-- Supabase Auth — precisa do próprio mecanismo de token, igual
-- divulgador_sessions).

create table public.divulgador_password_resets (
  id uuid primary key default gen_random_uuid(),
  divulgador_id uuid not null references public.divulgadores (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index divulgador_password_resets_divulgador_id_idx
  on public.divulgador_password_resets (divulgador_id);

-- Mesmo padrão de divulgador_sessions: RLS ligado, sem nenhuma policy — só o
-- service role (Server Actions via createAdminClient()) acessa.
alter table public.divulgador_password_resets enable row level security;

-- Ainda não existe canal de e-mail configurado (sem domínio próprio
-- verificado) — o link de redefinição chega pro admin via sino/push
-- (notifyAdmins) até isso mudar, daí o novo tipo de notificação.
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento',
      'avaliacao_recebida', 'lista_espera', 'novo_profissional',
      'divulgador_recuperacao_senha'
    )
  );
