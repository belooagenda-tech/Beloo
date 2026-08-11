-- Beloo — reagendamento self-service pelo cliente (link público de
-- "Meus agendamentos"). Antes só existia cancelar; mesmo padrão de segurança
-- de cancel_public_appointment (RPC security definer, telefone confere quem
-- é o dono do agendamento, janela mínima igual à de cancelamento) — só que
-- em vez de marcar `cancelado`, atualiza inicio/fim e reseta pra `agendado`
-- (o profissional reconfirma o novo horário). O constraint de exclusão
-- appointments_no_overlap já existente segue sendo a única fonte de verdade
-- contra choque de horário, igual no fluxo de criação.

create type public.public_reschedule_appointment_result as (
  appointment_id uuid,
  business_id uuid,
  profile_id uuid,
  business_timezone text,
  client_nome text,
  service_id uuid,
  service_nome text,
  inicio timestamptz
);

create function public.reschedule_public_appointment(
  p_slug text,
  p_appointment_id uuid,
  p_telefone text,
  p_novo_inicio timestamptz
)
returns public.public_reschedule_appointment_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_appointment appointments%rowtype;
  v_client clients%rowtype;
  v_service services%rowtype;
  v_novo_fim timestamptz;
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
    raise exception 'Agendamento não pode mais ser reagendado' using errcode = 'BL006';
  end if;

  -- Mesma janela mínima do cancelamento — reagendar em cima da hora tem o
  -- mesmo risco de pegar o profissional de surpresa.
  if v_appointment.inicio - make_interval(hours => v_business.cancelamento_min_horas) < now() then
    raise exception 'Fora do prazo de reagendamento' using errcode = 'BL007';
  end if;

  select * into v_service from services where id = v_appointment.service_id;
  if not found or not v_service.ativo then
    raise exception 'Serviço não encontrado ou inativo' using errcode = 'BL002';
  end if;

  v_novo_fim := p_novo_inicio + make_interval(mins => v_service.duracao_min);

  begin
    update appointments
    set inicio = p_novo_inicio, fim = v_novo_fim, status = 'agendado'
    where id = p_appointment_id;
  exception
    when exclusion_violation then
      raise exception 'Horário indisponível' using errcode = '23P01';
  end;

  return row(
    v_appointment.id, v_business.id, v_business.profile_id, v_business.timezone,
    v_client.nome, v_service.id, v_service.nome, p_novo_inicio
  )::public.public_reschedule_appointment_result;
end;
$$;

revoke all on function public.reschedule_public_appointment(text, uuid, text, timestamptz) from public;
grant execute on function public.reschedule_public_appointment(text, uuid, text, timestamptz) to anon, authenticated;

-- Novo tipo de notificação (sino do profissional) pro aviso de reagendamento.
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento'
    )
  );
