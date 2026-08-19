-- Beloo — Equipe: suporte a múltiplos profissionais dentro de uma mesma loja.
--
-- Desenho propositalmente aditivo/opt-in: uma loja sem nenhuma linha em
-- `professionals` continua se comportando 100% como antes em todo o sistema
-- (agenda, vitrine pública, financeiro) — nenhuma query nem RLS existente
-- muda de comportamento. Profissionais não têm login próprio: é um cadastro
-- interno gerenciado pelo dono da loja (mesmo padrão de `services`/`products`),
-- vinculado aos serviços que cada um faz.

-- ============================================================================
-- professionals — membros da equipe cadastrados pelo dono da loja
-- ============================================================================
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  foto_url text,
  cor text,
  ativo boolean not null default true,
  -- Quando true, a disponibilidade desse profissional vem de
  -- professional_hours/professional_exceptions em vez da disponibilidade
  -- geral da loja (business_hours/business_exceptions).
  usa_horario_proprio boolean not null default false,
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

create index professionals_business_id_idx on public.professionals (business_id);

-- ============================================================================
-- professional_services — quais serviços cada profissional faz. Um serviço
-- sem nenhuma linha aqui continua reservando a loja inteira como recurso
-- único no agendamento público (ver migration de booking público) — permite
-- adoção incremental, serviço por serviço.
-- ============================================================================
create table public.professional_services (
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (professional_id, service_id)
);

create index professional_services_service_id_idx on public.professional_services (service_id);

-- ============================================================================
-- professional_hours / professional_exceptions — clones de business_hours /
-- business_exceptions, só usados quando professionals.usa_horario_proprio.
-- ============================================================================
create table public.professional_hours (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  constraint professional_hora_fim_maior check (hora_fim > hora_inicio)
);

create index professional_hours_professional_id_idx on public.professional_hours (professional_id);

create table public.professional_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('folga', 'horario_especial')),
  hora_inicio time,
  hora_fim time,
  constraint professional_horario_especial_tem_horas check (
    tipo = 'folga' or (hora_inicio is not null and hora_fim is not null and hora_fim > hora_inicio)
  ),
  unique (professional_id, data)
);

create index professional_exceptions_professional_id_idx on public.professional_exceptions (professional_id);

-- ============================================================================
-- agenda_blocks.professional_id — bloqueio pontual criado na Agenda pode
-- valer só para um profissional específico. null continua bloqueando a loja
-- inteira, comportamento atual intacto.
-- ============================================================================
alter table public.agenda_blocks
  add column professional_id uuid references public.professionals (id) on delete cascade;

create index agenda_blocks_professional_id_idx on public.agenda_blocks (professional_id);

-- ============================================================================
-- businesses.modo_selecao_profissional — controla o passo de escolha de
-- profissional na vitrine pública.
-- ============================================================================
alter table public.businesses
  add column modo_selecao_profissional text not null default 'automatico'
  check (modo_selecao_profissional in ('cliente_escolhe', 'automatico'));

-- ============================================================================
-- appointments.professional_id + ajuste no constraint de exclusão.
--
-- EXCLUDE USING gist trata NULL = NULL como não-verdadeiro — uma coluna
-- nullable "crua" quebraria a proteção contra sobreposição pra lojas sem
-- equipe (dois agendamentos com professional_id null deixariam de colidir
-- entre si). Coalesce pra um UUID sentinela dentro do próprio constraint
-- resolve isso: agendamentos sem profissional continuam concorrendo pelo
-- "slot único da loja" (comportamento atual, intacto); profissionais
-- diferentes podem atender ao mesmo tempo; o mesmo profissional continua
-- proibido de ter dois agendamentos sobrepostos.
-- ============================================================================
alter table public.appointments
  add column professional_id uuid references public.professionals (id) on delete set null;

create index appointments_professional_id_idx on public.appointments (professional_id);

alter table public.appointments drop constraint appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    business_id with =,
    (coalesce(professional_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    tstzrange(inicio, fim) with &&
  )
  where (status <> 'cancelado');

-- ============================================================================
-- RLS
-- ============================================================================
create function public.owns_professional(target_professional_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.professionals p
    where p.id = target_professional_id and owns_business(p.business_id)
  );
$$;

alter table public.professionals enable row level security;

create policy "professionals_select_own" on public.professionals
  for select using (owns_business(business_id));

create policy "professionals_insert_own" on public.professionals
  for insert with check (owns_business(business_id));

create policy "professionals_update_own" on public.professionals
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "professionals_delete_own" on public.professionals
  for delete using (owns_business(business_id));

alter table public.professional_services enable row level security;

create policy "professional_services_select_own" on public.professional_services
  for select using (owns_professional(professional_id));

create policy "professional_services_insert_own" on public.professional_services
  for insert with check (owns_professional(professional_id));

create policy "professional_services_update_own" on public.professional_services
  for update using (owns_professional(professional_id)) with check (owns_professional(professional_id));

create policy "professional_services_delete_own" on public.professional_services
  for delete using (owns_professional(professional_id));

alter table public.professional_hours enable row level security;

create policy "professional_hours_select_own" on public.professional_hours
  for select using (owns_professional(professional_id));

create policy "professional_hours_insert_own" on public.professional_hours
  for insert with check (owns_professional(professional_id));

create policy "professional_hours_update_own" on public.professional_hours
  for update using (owns_professional(professional_id)) with check (owns_professional(professional_id));

create policy "professional_hours_delete_own" on public.professional_hours
  for delete using (owns_professional(professional_id));

alter table public.professional_exceptions enable row level security;

create policy "professional_exceptions_select_own" on public.professional_exceptions
  for select using (owns_professional(professional_id));

create policy "professional_exceptions_insert_own" on public.professional_exceptions
  for insert with check (owns_professional(professional_id));

create policy "professional_exceptions_update_own" on public.professional_exceptions
  for update using (owns_professional(professional_id)) with check (owns_professional(professional_id));

create policy "professional_exceptions_delete_own" on public.professional_exceptions
  for delete using (owns_professional(professional_id));

-- ============================================================================
-- replace_professional_hours — clone de replace_business_hours, escopado a
-- um profissional em vez da loja inteira.
-- ============================================================================
create function public.replace_professional_hours(p_professional_id uuid, p_hours jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  if not owns_professional(p_professional_id) then
    raise exception 'not authorized';
  end if;

  delete from public.professional_hours where professional_id = p_professional_id;

  insert into public.professional_hours (professional_id, dia_semana, hora_inicio, hora_fim)
  select
    p_professional_id,
    (elem ->> 'dia_semana')::smallint,
    (elem ->> 'hora_inicio')::time,
    (elem ->> 'hora_fim')::time
  from jsonb_array_elements(p_hours) as elem;
end;
$$;

revoke all on function public.replace_professional_hours(uuid, jsonb) from public;
grant execute on function public.replace_professional_hours(uuid, jsonb) to authenticated;

-- ============================================================================
-- storage — fotos dos profissionais, mesmo padrão do bucket "product-images".
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('professional-photos', 'professional-photos', true, 4 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "professional_photos_public_read" on storage.objects
  for select using (bucket_id = 'professional-photos');

create policy "professional_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'professional-photos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "professional_photos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'professional-photos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'professional-photos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "professional_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'professional-photos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );
