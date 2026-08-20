-- Beloo — sincronização com o Google Calendar
--
-- Duas direções, cada uma com sua própria trilha de dados:
--
-- 1) Beloo -> Google: todo agendamento criado/atualizado/cancelado no app é
--    espelhado como um evento na agenda do Google do profissional
--    (appointments.google_event_id guarda o id do evento pra permitir
--    atualizar/apagar depois). O evento carrega
--    extendedProperties.private.belooAppointmentId — é assim que o import
--    (ponto 2) reconhece e ignora os próprios eventos que a Beloo criou, sem
--    depender de nenhuma tabela auxiliar pra isso.
--
-- 2) Google -> Beloo: o profissional escolhe, evento por evento, quais
--    compromissos já existentes no Google Calendar quer trazer pra agenda da
--    Beloo. Como um evento do Google não tem cliente/serviço/preço (não é um
--    "agendamento" de verdade), cada um vira um bloqueio de horário
--    (agenda_blocks) — só ocupa a agenda e mostra o título do evento como
--    motivo, igual a um bloqueio manual. google_calendar_imports registra
--    quais eventos já foram trazidos pra não duplicar se o profissional abrir
--    o importador de novo.
-- Mesmo padrão de mp_connections: RLS habilitado SEM nenhuma policy — nem o
-- próprio dono da loja consegue ler estas duas tabelas pelo client
-- anon/authenticated, só o service role (usado nas Server Actions e rotas de
-- API via createAdminClient()). Os tokens de acesso ao Google ficam aqui;
-- toda leitura/gravação já passa por código server-only.
create table public.google_calendar_connections (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  -- Por enquanto sempre 'primary' (a agenda principal da conta Google
  -- conectada) — campo já existe pra permitir escolher outra agenda no
  -- futuro sem precisar de migration nova.
  calendar_id text not null default 'primary',
  -- Se falso, agendamentos da Beloo continuam sendo criados/cancelados
  -- normalmente, só não são mais espelhados pro Google (útil pra quem quer
  -- importar uma vez e não manter os dois lados sincronizados depois).
  export_enabled boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger google_calendar_connections_set_updated_at
  before update on public.google_calendar_connections
  for each row
  execute function public.set_updated_at();

create table public.google_calendar_imports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  google_event_id text not null,
  agenda_block_id uuid references public.agenda_blocks (id) on delete cascade,
  imported_at timestamptz not null default now(),
  unique (business_id, google_event_id)
);

create index google_calendar_imports_business_id_idx on public.google_calendar_imports (business_id);

alter table public.appointments
  add column google_event_id text,
  add column google_synced_at timestamptz;

alter table public.agenda_blocks
  add column google_event_id text;

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_imports enable row level security;
