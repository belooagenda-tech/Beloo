-- Beloo — planos pagos (Grátis / Pro / Studio)
-- Substitui o sistema de cobrança de preço único (nunca ligado em produção)
-- por 3 tiers com features diferentes. Sem assinantes reais hoje, então essa
-- migration não precisa de lógica de transição/migração de dados.

-- ============================================================================
-- businesses.plan_tier — fonte de verdade de quais features o negócio tem.
-- Mesmo padrão de modo_selecao_profissional (texto + check, sem enum).
-- ============================================================================
alter table public.businesses
  add column plan_tier text not null default 'gratis' check (plan_tier in ('gratis', 'pro', 'studio'));

-- ============================================================================
-- saas_plans — troca o interruptor mestre "billing_enabled" (nunca ligado)
-- por preços configuráveis dos planos pagos. valor_mensal (antigo, preço
-- único) fica sem uso, mas não é removido pra não quebrar o tipo à toa.
-- ============================================================================
alter table public.saas_plans add column valor_mensal_pro numeric(10, 2) not null default 49.90;
alter table public.saas_plans add column valor_mensal_studio numeric(10, 2) not null default 89.90;
alter table public.saas_plans drop column if exists billing_enabled;
alter table public.saas_plans drop column if exists billing_enabled_at;

-- ============================================================================
-- Sem trial mais: Grátis é permanente (limitado), então nenhum negócio novo
-- precisa de uma saas_subscriptions criada de cara. Ela passa a nascer só
-- quando alguém realmente assina Pro/Studio (ver webhook do Stripe).
-- ============================================================================
drop trigger if exists on_business_created_saas_subscription on public.businesses;
drop function if exists public.handle_new_business_saas_subscription();

-- saas_subscriptions passa a ser criada via upsert no primeiro checkout
-- pago (ver webhook do Stripe) — sem trial, trial_ends_at não se aplica mais.
alter table public.saas_subscriptions alter column trial_ends_at drop not null;

-- ============================================================================
-- Limite de 30 agendamentos/mês no plano Grátis. `appointments` e
-- `professionals` são inseridos direto do client (sem Server Action, só RLS)
-- — um trigger é o único jeito de fechar essa porta nos dois pontos de
-- entrada (RPC pública `create_public_appointment` e o insert direto da
-- Agenda) com uma regra só, sem depender do que o client manda.
-- ============================================================================
create function public.check_appointment_plan_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan_tier text;
  v_count integer;
begin
  if new.status = 'cancelado' then
    return new;
  end if;

  select plan_tier into v_plan_tier from public.businesses where id = new.business_id;

  if v_plan_tier = 'gratis' then
    select count(*) into v_count
    from public.appointments
    where business_id = new.business_id
      and status <> 'cancelado'
      and inicio >= date_trunc('month', now())
      and inicio < date_trunc('month', now()) + interval '1 month';

    if v_count >= 30 then
      raise exception 'Limite de 30 agendamentos/mês do plano Grátis atingido' using errcode = 'BL010';
    end if;
  end if;

  return new;
end;
$$;

create trigger appointments_check_plan_limit
  before insert on public.appointments
  for each row
  execute function public.check_appointment_plan_limit();

-- ============================================================================
-- Múltiplos profissionais é exclusivo do Studio — Grátis e Pro ficam
-- limitados a 1 profissional ativo cadastrado.
-- ============================================================================
create function public.check_professional_plan_limit()
returns trigger
language plpgsql
as $$
declare
  v_plan_tier text;
  v_count integer;
begin
  if new.ativo = false then
    return new;
  end if;

  select plan_tier into v_plan_tier from public.businesses where id = new.business_id;

  if v_plan_tier in ('gratis', 'pro') then
    select count(*) into v_count
    from public.professionals
    where business_id = new.business_id and ativo = true;

    if v_count >= 1 then
      raise exception 'Múltiplos profissionais é exclusivo do plano Studio' using errcode = 'BL011';
    end if;
  end if;

  return new;
end;
$$;

create trigger professionals_check_plan_limit_insert
  before insert on public.professionals
  for each row
  execute function public.check_professional_plan_limit();

-- Reativar um profissional desativado (update ativo=false -> true) tem que
-- passar pela mesma checagem — senão dá pra burlar o limite desativando e
-- reativando. Como é BEFORE trigger, a linha na tabela ainda tem o ativo
-- antigo (false) no momento da contagem, então a própria linha nunca se
-- conta duas vezes.
create trigger professionals_check_plan_limit_update
  before update on public.professionals
  for each row
  when (old.ativo is distinct from new.ativo)
  execute function public.check_professional_plan_limit();
