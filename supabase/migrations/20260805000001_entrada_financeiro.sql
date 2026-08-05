-- Beloo — a entrada paga pelo cliente (Mercado Pago) nunca era registrada em
-- appointment_payments: o profissional não via na Agenda que a entrada já
-- tinha sido paga, a aba Financeiro não contabilizava esse dinheiro (só o que
-- passava por "Concluir e receber"), e o modal de conclusão sempre sugeria
-- cobrar o preço cheio de novo, ignorando o que o cliente já pagou online.
--
-- Esta migration:
--   1) adiciona appointment_payments.entrada_valor, para registrar quanto do
--      valor total do pagamento veio da entrada paga online (Mercado Pago) —
--      o restante (valor - entrada_valor) é o que foi cobrado na hora;
--   2) permite os novos forma_pagamento 'entrada_mp' (100% pago online antes
--      do atendimento) e 'misto' (parte online + parte cobrada na hora);
--   3) atualiza complete_appointment_payment para receber esse valor e somar
--      ao valor cobrado na conclusão, sem sobrescrever o que já foi pago —
--      a Agenda/Financeiro passam a refletir a entrada assim que o webhook do
--      Mercado Pago confirma o pagamento, não só quando o profissional
--      "concluir e receber" o atendimento.

alter table public.appointment_payments
  add column entrada_valor numeric(10, 2) check (entrada_valor is null or entrada_valor >= 0);

alter table public.appointment_payments drop constraint appointment_payments_forma_pagamento_check;

alter table public.appointment_payments
  add constraint appointment_payments_forma_pagamento_check check (
    forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito', 'plano', 'entrada_mp', 'misto')
  );

-- Assinatura muda (novo parâmetro p_entrada_valor) — precisa dropar a versão
-- antiga antes de recriar, senão o Postgres cria uma segunda função
-- sobrecarregada em vez de substituir a existente.
drop function if exists public.complete_appointment_payment(uuid, numeric, text, text);

create function public.complete_appointment_payment(
  p_appointment_id uuid,
  p_valor numeric,
  p_forma_pagamento text,
  p_origem text,
  p_entrada_valor numeric default 0
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

  -- p_valor já vem somado (entrada + restante cobrado agora) do chamador;
  -- entrada_valor só registra a fatia disso que já tinha entrado via
  -- Mercado Pago antes da conclusão, para exibição/auditoria. Se a entrada já
  -- tinha sido registrada pelo webhook (mesmo appointment_id), o "on conflict"
  -- atualiza o mesmo registro em vez de duplicar — e mantém o pago_em
  -- original (o momento em que o dinheiro de fato começou a entrar).
  insert into public.appointment_payments
    (appointment_id, valor, forma_pagamento, origem, entrada_valor, pago_em)
  values (
    p_appointment_id, p_valor, p_forma_pagamento, p_origem,
    nullif(p_entrada_valor, 0), now()
  )
  on conflict (appointment_id) do update
    set valor = excluded.valor,
        forma_pagamento = excluded.forma_pagamento,
        origem = excluded.origem,
        entrada_valor = excluded.entrada_valor
  returning id into v_payment_id;

  update public.appointments set status = 'concluido' where id = p_appointment_id;

  return query select v_payment_id, v_credito_descontado;
end;
$$;

revoke all on function public.complete_appointment_payment(uuid, numeric, text, text, numeric) from public;
grant execute on function public.complete_appointment_payment(uuid, numeric, text, text, numeric) to authenticated;
