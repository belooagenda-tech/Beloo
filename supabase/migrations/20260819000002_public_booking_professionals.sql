-- Beloo — create_public_appointment ganha suporte a profissional.
--
-- Regra de participação: um serviço só entra no fluxo de equipe se existir
-- pelo menos 1 vínculo em professional_services para ele — assim uma loja
-- pode cadastrar profissionais aos poucos, serviço por serviço, sem quebrar
-- o agendamento dos serviços que ainda não vinculou a ninguém (esses
-- continuam com professional_id null, exatamente como hoje).
--
-- p_professional_id vem preenchido quando o cliente escolheu um profissional
-- na vitrine (modo "cliente_escolhe"); vem null no modo "automatico" ou
-- quando o cliente marcou "sem preferência" — nesse caso a própria função
-- escolhe, de forma atômica, o primeiro profissional elegível e livre nesse
-- horário (a corrida de concorrência real continua garantida pelo
-- constraint de exclusão no insert, isso aqui só evita atribuir alguém
-- obviamente ocupado).
drop function if exists public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer, jsonb
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
  p_max_agendamentos_futuros integer,
  p_produtos jsonb default '[]'::jsonb,
  p_professional_id uuid default null
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
  v_participa boolean;
  v_professional_id uuid;
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

  -- "Participa" só conta profissional ativo — precisa bater exatamente com
  -- o critério usado em getAvailableSlotsForService (TS), senão o cliente
  -- pode ver um horário como disponível (loja "sem equipe" nesse serviço,
  -- caindo no cálculo legado) e a gravação aqui cair no ramo de atribuição
  -- automática só pra não achar ninguém livre.
  select exists (
    select 1 from professional_services ps
    join professionals p on p.id = ps.professional_id
    where ps.service_id = v_service.id and p.ativo = true
  ) into v_participa;

  if v_participa then
    if p_professional_id is not null then
      select p.id into v_professional_id
      from professionals p
      join professional_services ps on ps.professional_id = p.id and ps.service_id = v_service.id
      where p.id = p_professional_id and p.business_id = v_business.id and p.ativo = true;

      if v_professional_id is null then
        raise exception 'Profissional indisponível para esse serviço' using errcode = 'BL009';
      end if;
    else
      select p.id into v_professional_id
      from professionals p
      join professional_services ps on ps.professional_id = p.id and ps.service_id = v_service.id
      where p.business_id = v_business.id
        and p.ativo = true
        and not exists (
          select 1 from appointments a
          where a.professional_id = p.id
            and a.status <> 'cancelado'
            and tstzrange(a.inicio, a.fim) && tstzrange(p_inicio, v_fim)
        )
      order by p.ordem, p.created_at
      limit 1;

      if v_professional_id is null then
        raise exception 'Nenhum profissional disponível nesse horário' using errcode = 'BL009';
      end if;
    end if;
  else
    v_professional_id := null;
  end if;

  -- Dedup por telefone dentro da loja — igual à unique (business_id,
  -- telefone) de clients. ON CONFLICT cobre a corrida entre duas requisições
  -- simultâneas do mesmo número.
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
      business_id, client_id, service_id, professional_id, inicio, fim, status,
      entrada_status, entrada_valor, entrada_expira_em
    )
    values (
      v_business.id, v_client_id, v_service.id, v_professional_id, p_inicio, v_fim,
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

  if jsonb_array_length(coalesce(p_produtos, '[]'::jsonb)) > 0 then
    insert into appointment_products (appointment_id, product_id, nome_snapshot, preco_snapshot, quantidade)
    select
      v_appointment_id,
      pr.id,
      pr.nome,
      pr.preco,
      greatest(coalesce((item ->> 'quantidade')::int, 1), 1)
    from jsonb_array_elements(p_produtos) item
    join products pr on pr.id = nullif(item ->> 'product_id', '')::uuid
    where pr.business_id = v_business.id and pr.ativo = true;
  end if;

  return row(
    v_appointment_id, v_client_id, v_client_nome, v_business.id,
    v_business.profile_id, v_business.timezone, v_service.nome
  )::public.public_create_appointment_result;
end;
$$;

revoke all on function public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer, jsonb, uuid
) from public;
grant execute on function public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer, jsonb, uuid
) to anon, authenticated;
