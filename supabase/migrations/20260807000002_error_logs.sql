-- Beloo — log de erros persistido, visível numa aba "Logs" do admin.
-- Alternativa mais simples que plugar um APM externo agora: os mesmos
-- pontos que já chamam logError() (webhooks de pagamento, crons, fluxo
-- público de agendamento) passam a gravar aqui também, além do console.
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  message text not null,
  business_id uuid references public.businesses (id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index error_logs_created_at_idx on public.error_logs (created_at desc);
create index error_logs_business_id_idx on public.error_logs (business_id);
create index error_logs_unresolved_idx on public.error_logs (created_at desc) where not resolved;

alter table public.error_logs enable row level security;
-- Mesmo padrão de mp_connections/divulgadores/rate_limit_hits: RLS ligado,
-- sem policy — só o service role grava (dentro de logError) e só a página
-- /app/admin/logs lê, depois de checar profiles.is_admin na aplicação.

-- Faxina: mantém a tabela sob controle sem exigir intervenção manual —
-- resolvidos com mais de 90 dias, e qualquer log (resolvido ou não) com mais
-- de 1 ano, são descartados. Roda dentro do cron de expire-entradas, que já
-- executa a cada 15 minutos.
create function public.cleanup_old_error_logs()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.error_logs
  where (resolved and resolved_at < now() - interval '90 days')
     or created_at < now() - interval '1 year';
$$;

revoke all on function public.cleanup_old_error_logs() from public;
grant execute on function public.cleanup_old_error_logs() to service_role;
