-- Beloo — rate limiting nas Server Actions públicas + limites do bucket de logos
-- (achados 🔴/🟠 da auditoria de 2026-08-07).
--
-- Rate limiting: contador de janela fixa em Postgres (sem infra nova). A
-- chave já embute a janela ("chave:ip:acao"), então cada linha representa
-- "N tentativas dessa chave nessa janela de X segundos". check_rate_limit()
-- faz upsert atômico (insert ... on conflict do update) e limpa janelas
-- antigas a cada chamada, então a tabela nunca cresce sem limite.
create table public.rate_limit_hits (
  chave text not null,
  janela timestamptz not null,
  tentativas integer not null default 1,
  primary key (chave, janela)
);

create index rate_limit_hits_janela_idx on public.rate_limit_hits (janela);

alter table public.rate_limit_hits enable row level security;
-- Mesmo padrão de mp_connections/divulgadores: RLS ligado, sem policy — só o
-- service role (usado exclusivamente dentro de check_rate_limit, que roda
-- como security definer) acessa a tabela.

create function public.check_rate_limit(
  p_chave text,
  p_janela_segundos integer,
  p_max_tentativas integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_janela timestamptz;
  v_tentativas integer;
begin
  v_janela := to_timestamp(floor(extract(epoch from now()) / p_janela_segundos) * p_janela_segundos);

  insert into public.rate_limit_hits (chave, janela, tentativas)
  values (p_chave, v_janela, 1)
  on conflict (chave, janela)
  do update set tentativas = rate_limit_hits.tentativas + 1
  returning tentativas into v_tentativas;

  -- Faxina oportunista de janelas antigas — mantém a tabela pequena sem
  -- precisar de um cron dedicado só para isso.
  delete from public.rate_limit_hits where janela < v_janela - interval '1 hour';

  return v_tentativas <= p_max_tentativas;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated, service_role;

-- ============================================================================
-- Bucket "logos" — hoje só validado no client (achado 🟠: bypassável via API
-- direta). Passa a ser aplicado pelo próprio Storage.
-- ============================================================================
update storage.buckets
set file_size_limit = 4 * 1024 * 1024, -- 4MB, mesmo limite já comunicado no client
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'logos';
