-- Beloo — rastreamento de conversão do Meta (Pixel + Conversions API) para o
-- funil de aquisição de assinantes (anúncio -> cadastro -> trial -> assinatura
-- paga). Cobre: captura de fbc/fbp no cadastro, configuração do pixel/token
-- pelo admin da plataforma (não por-tenant, é o pixel DA BELOO) e um log dos
-- eventos enviados pra debugar sem abrir o Events Manager.

-- ============================================================================
-- businesses.meta_fbc / meta_fbp — capturados no momento do cadastro
-- (criar-agenda passo 2). Preservados mesmo depois que os cookies do
-- navegador expiram, porque o evento "Subscribe" acontece dias depois, via
-- webhook, sem navegador nenhum aberto — é a única forma do Meta atribuir a
-- assinatura paga ao clique no anúncio original.
-- ============================================================================
alter table public.businesses add column meta_fbc text;
alter table public.businesses add column meta_fbp text;

-- ============================================================================
-- meta_ads_settings — Pixel ID + Access Token da Conversions API + Test Event
-- Code, configurados pelo admin da plataforma em /app/admin/anuncios. Singleton
-- (mesmo padrão de saas_plans: sempre 1 linha). access_token é gravado
-- criptografado (ver src/lib/crypto.ts, mesmo esquema AES-256-GCM usado para
-- os tokens OAuth do Mercado Pago) — nunca em texto puro, nunca devolvido pro
-- client depois de salvo.
-- ============================================================================
create table public.meta_ads_settings (
  id uuid primary key default gen_random_uuid(),
  pixel_id text,
  access_token text,
  test_event_code text,
  -- Desligado por padrão (mesmo padrão de saas_plans.billing_enabled): mesmo
  -- com as credenciais salvas, só passa a disparar depois que o admin liga o
  -- toggle explicitamente.
  tracking_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.meta_ads_settings (pixel_id)
select null
where not exists (select 1 from public.meta_ads_settings);

create trigger meta_ads_settings_set_updated_at
  before update on public.meta_ads_settings
  for each row
  execute function public.set_updated_at();

alter table public.meta_ads_settings enable row level security;
-- Sem policy — só o service role lê/grava (páginas e actions checam
-- profiles.is_admin na aplicação antes de tocar aqui), igual mp_connections.

-- ============================================================================
-- meta_ads_events_log — histórico dos eventos mandados pra Conversions API,
-- pro admin conseguir debugar em /app/admin/anuncios sem abrir o Events
-- Manager toda hora.
-- ============================================================================
create table public.meta_ads_events_log (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_id text,
  business_id uuid references public.businesses (id) on delete set null,
  status text not null check (status in ('success', 'error')),
  status_code integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index meta_ads_events_log_created_at_idx on public.meta_ads_events_log (created_at desc);
create index meta_ads_events_log_business_id_idx on public.meta_ads_events_log (business_id);

alter table public.meta_ads_events_log enable row level security;
-- Mesmo padrão de error_logs: RLS ligado, sem policy — só o service role
-- grava (dentro de src/lib/meta-ads/capi.ts) e só a tela do admin lê.

-- Faxina: evita a tabela crescer pra sempre — mantém só os últimos 60 dias.
-- Chamada pelo mesmo cron diário que já limpa error_logs (ver
-- src/app/api/cron/expire-entradas/route.ts).
create function public.cleanup_old_meta_ads_events_log()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.meta_ads_events_log
  where created_at < now() - interval '60 days';
$$;

revoke all on function public.cleanup_old_meta_ads_events_log() from public;
grant execute on function public.cleanup_old_meta_ads_events_log() to service_role;
