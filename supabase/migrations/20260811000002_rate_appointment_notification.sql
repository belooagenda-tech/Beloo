-- Beloo — o profissional precisa ficar sabendo quando recebe uma avaliação,
-- não só ver quem já avaliou se ele mesmo for procurar no perfil do cliente.
-- Enriquece o retorno de rate_public_appointment com os dados necessários
-- pra notificar (sino + push), no mesmo padrão de
-- create_public_appointment/cancel_public_appointment/reschedule_public_appointment.

drop function if exists public.rate_public_appointment(text, uuid, text, smallint, text);

create type public.public_rate_appointment_result as (
  appointment_id uuid,
  business_id uuid,
  profile_id uuid,
  client_nome text,
  service_nome text,
  nota smallint,
  comentario text
);

create function public.rate_public_appointment(
  p_slug text,
  p_appointment_id uuid,
  p_telefone text,
  p_nota smallint,
  p_comentario text
)
returns public.public_rate_appointment_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_appointment appointments%rowtype;
  v_client clients%rowtype;
  v_service_nome text;
  v_rating appointment_ratings%rowtype;
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

  if v_appointment.status <> 'concluido' then
    raise exception 'Só é possível avaliar atendimentos concluídos' using errcode = 'BL008';
  end if;

  select nome into v_service_nome from services where id = v_appointment.service_id;

  insert into appointment_ratings (appointment_id, nota, comentario)
  values (p_appointment_id, p_nota, p_comentario)
  on conflict (appointment_id) do update set nota = excluded.nota, comentario = excluded.comentario
  returning * into v_rating;

  return row(
    v_appointment.id, v_business.id, v_business.profile_id,
    v_client.nome, v_service_nome, v_rating.nota, v_rating.comentario
  )::public.public_rate_appointment_result;
end;
$$;

revoke all on function public.rate_public_appointment(text, uuid, text, smallint, text) from public;
grant execute on function public.rate_public_appointment(text, uuid, text, smallint, text) to anon, authenticated;

-- Novo tipo de notificação (sino do profissional) pro aviso de avaliação recebida.
alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento', 'avaliacao_recebida'
    )
  );
