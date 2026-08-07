-- Beloo — RPCs security definer para o fluxo público de agendamento (achado
-- 🟡 da auditoria de 2026-08-07: criar/cancelar agendamento usava
-- createAdminClient() com filtro manual .eq("business_id", ...) em cada
-- query — funciona, mas o limite de segurança fica espalhado em TypeScript
-- em vez de centralizado, e um filtro esquecido no futuro vira IDOR
-- silencioso sem o RLS pra pegar (o admin client ignora RLS por completo).
--
-- Aqui a escrita em si (criar/cancelar) passa a viver numa função só,
-- auditável e testável isoladamente, no mesmo padrão de
-- is_slug_available/complete_appointment_payment/replace_business_hours já
-- usados no resto do projeto. O que continua em TypeScript, de propósito:
--   - o cálculo de horários disponíveis (computeAvailableSlots — algoritmo
--     grande, já teria que existir em TS pro client component pré-visualizar
--     a agenda; portar pra SQL duplicaria manutenção sem ganho de segurança:
--     quem garante "não dá dois agendamentos no mesmo horário" de verdade é
--     o constraint de exclusão appointments_no_overlap, que a função abaixo
--     já aciona);
--   - qualquer chamada HTTP externa (Mercado Pago) — Postgres não faz isso.

-- ============================================================================
-- create_public_appointment
-- ============================================================================
create type public.public_create_appointment_result as (
  appointment_id uuid,
  client_id uuid,
  client_nome text,
  business_id uuid,
  profile_id uuid,
  business_timezone text,
  service_nome text
);

create function public.create_public_appointment(
  p_slug text,
  p_service_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_cobrar_entrada boolean,
  p_entrada_valor numeric,
  p_entrada_expira_em timestamptz,
  p_max_agendamentos_futuros integer
)
returns public.public_create_appointment_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_service services%rowtype;
  v_client_id uuid;
  v_client_nome text;
  v_fim timestamptz;
  v_appointment_id uuid;
  v_agendamentos_futuros integer;
begin
  select * into v_business from businesses where slug = p_slug;
  if not found then
    raise exception 'Loja não encontrada' using errcode = 'BL001';
  end if;

  select * into v_service
  from services
  where id = p_service_id and business_id = v_business.id;
  if not found or not v_service.ativo then
    raise exception 'Serviço não encontrado ou inativo' using errcode = 'BL002';
  end if;

  v_fim := p_inicio + make_interval(mins => v_service.duracao_min);

  -- Dedup por telefone dentro da loja — igual à unique (business_id,
  -- telefone) de clients. ON CONFLICT cobre a corrida entre duas requisições
  -- simultâneas do mesmo número (não existia proteção pra isso antes).
  select id, nome into v_client_id, v_client_nome
  from clients
  where business_id = v_business.id and telefone = p_telefone;

  if v_client_id is null then
    insert into clients (business_id, nome, telefone)
    values (v_business.id, p_nome, p_telefone)
    on conflict (business_id, telefone) do update set nome = clients.nome
    returning id, nome into v_client_id, v_client_nome;
  else
    select count(*) into v_agendamentos_futuros
    from appointments
    where client_id = v_client_id
      and status in ('agendado', 'confirmado')
      and inicio > now();

    if v_agendamentos_futuros >= p_max_agendamentos_futuros then
      raise exception 'Muitos agendamentos futuros' using errcode = 'BL003';
    end if;
  end if;

  begin
    insert into appointments (
      business_id, client_id, service_id, inicio, fim, status,
      entrada_status, entrada_valor, entrada_expira_em
    )
    values (
      v_business.id, v_client_id, v_service.id, p_inicio, v_fim,
      case when p_cobrar_entrada then 'aguardando_pagamento' else 'agendado' end,
      case when p_cobrar_entrada then 'pendente' else 'nao_aplicavel' end,
      p_entrada_valor,
      p_entrada_expira_em
    )
    returning id into v_appointment_id;
  exception
    when exclusion_violation then
      raise exception 'Horário indisponível' using errcode = '23P01';
  end;

  return row(
    v_appointment_id, v_client_id, v_client_nome, v_business.id,
    v_business.profile_id, v_business.timezone, v_service.nome
  )::public.public_create_appointment_result;
end;
$$;

revoke all on function public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer
) from public;
grant execute on function public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer
) to anon, authenticated;

-- ============================================================================
-- cancel_public_appointment
-- ============================================================================
create type public.public_cancel_appointment_result as (
  appointment_id uuid,
  business_id uuid,
  profile_id uuid,
  business_timezone text,
  client_nome text,
  service_id uuid,
  service_nome text,
  inicio timestamptz,
  entrada_status text,
  mp_payment_id text
);

create function public.cancel_public_appointment(
  p_slug text,
  p_appointment_id uuid,
  p_telefone text
)
returns public.public_cancel_appointment_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_appointment appointments%rowtype;
  v_client clients%rowtype;
  v_service_nome text;
begin
  select * into v_business from businesses where slug = p_slug;
  if not found then
    raise exception 'Loja não encontrada' using errcode = 'BL001';
  end if;

  select * into v_appointment
  from appointments
  where id = p_appointment_id and business_id = v_business.id;
  if not found then
    raise exception 'Agendamento não encontrado' using errcode = 'BL004';
  end if;

  select * into v_client from clients where id = v_appointment.client_id;
  if v_client.telefone is distinct from p_telefone then
    raise exception 'Telefone não confere' using errcode = 'BL005';
  end if;

  if v_appointment.status not in ('agendado', 'confirmado') then
    raise exception 'Agendamento não pode mais ser cancelado' using errcode = 'BL006';
  end if;

  if v_appointment.inicio - make_interval(hours => v_business.cancelamento_min_horas) < now() then
    raise exception 'Fora do prazo de cancelamento' using errcode = 'BL007';
  end if;

  update appointments set status = 'cancelado' where id = p_appointment_id;

  select nome into v_service_nome from services where id = v_appointment.service_id;

  return row(
    v_appointment.id, v_business.id, v_business.profile_id, v_business.timezone,
    v_client.nome, v_appointment.service_id, v_service_nome, v_appointment.inicio,
    v_appointment.entrada_status, v_appointment.mp_payment_id
  )::public.public_cancel_appointment_result;
end;
$$;

revoke all on function public.cancel_public_appointment(text, uuid, text) from public;
grant execute on function public.cancel_public_appointment(text, uuid, text) to anon, authenticated;
