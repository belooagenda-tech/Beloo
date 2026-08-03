-- Beloo — complete_appointment_payment lia client_plan_subs sem travar a
-- linha. Duas conclusões de atendimento quase simultâneas do mesmo plano
-- (ex.: dois cliques rápidos, ou dois agendamentos do mesmo cliente
-- concluídos ao mesmo tempo) podiam ler o mesmo saldo de créditos e
-- descontar só 1 em vez de 2. "select ... for update" trava a linha até
-- o fim da transação, serializando essas chamadas.

create or replace function public.complete_appointment_payment(
  p_appointment_id uuid,
  p_valor numeric,
  p_forma_pagamento text,
  p_origem text
)
returns table (payment_id uuid, credito_descontado boolean)
language plpgsql
security invoker
as $$
declare
  v_appointment public.appointments%rowtype;
  v_sub public.client_plan_subs%rowtype;
  v_servicos_inclusos jsonb;
  v_entry jsonb;
  v_limite int;
  v_usados int;
  v_service_key text;
  v_payment_id uuid;
  v_credito_descontado boolean := false;
  v_ja_concluido boolean;
begin
  if not owns_appointment(p_appointment_id) then
    raise exception 'not_authorized';
  end if;

  select * into v_appointment from public.appointments where id = p_appointment_id;
  if v_appointment is null then
    raise exception 'appointment_not_found';
  end if;

  v_ja_concluido := v_appointment.status = 'concluido';
  v_service_key := v_appointment.service_id::text;

  if p_origem = 'plano' and not v_ja_concluido then
    select * into v_sub
    from public.client_plan_subs
    where client_id = v_appointment.client_id and ativo = true
    limit 1
    for update;

    if v_sub is null then
      raise exception 'no_active_plan';
    end if;

    select servicos_inclusos into v_servicos_inclusos
    from public.client_plans
    where id = v_sub.plan_id;

    select elem into v_entry
    from jsonb_array_elements(coalesce(v_servicos_inclusos, '[]'::jsonb)) elem
    where (elem ->> 'service_id') = v_service_key
    limit 1;

    if v_entry is null then
      raise exception 'plan_does_not_cover_service';
    end if;

    v_limite := nullif(v_entry ->> 'quantidade', '')::int;
    v_usados := coalesce((v_sub.creditos_usados ->> v_service_key)::int, 0);

    if v_limite is not null and v_usados >= v_limite then
      raise exception 'no_credits_left';
    end if;

    update public.client_plan_subs
    set creditos_usados = coalesce(creditos_usados, '{}'::jsonb)
      || jsonb_build_object(v_service_key, v_usados + 1)
    where id = v_sub.id;

    v_credito_descontado := true;
  end if;

  insert into public.appointment_payments (appointment_id, valor, forma_pagamento, origem, pago_em)
  values (p_appointment_id, p_valor, p_forma_pagamento, p_origem, now())
  on conflict (appointment_id) do update
    set valor = excluded.valor,
        forma_pagamento = excluded.forma_pagamento,
        origem = excluded.origem
  returning id into v_payment_id;

  update public.appointments set status = 'concluido' where id = p_appointment_id;

  return query select v_payment_id, v_credito_descontado;
end;
$$;
