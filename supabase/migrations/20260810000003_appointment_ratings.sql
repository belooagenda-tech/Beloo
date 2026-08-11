-- Beloo — avaliação pós-atendimento (nota 1-5 + comentário opcional) que o
-- cliente registra pelo link público, depois que o atendimento é concluído.
-- Mesmo padrão de segurança das outras escritas públicas: RPC security
-- definer que confere telefone + status antes de gravar, sem policy de
-- insert direta na tabela.

create table public.appointment_ratings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

create index appointment_ratings_appointment_id_idx on public.appointment_ratings (appointment_id);

alter table public.appointment_ratings enable row level security;

-- owns_appointment() já existe (ver supabase/migrations/20260731000002_rls.sql).
create policy "appointment_ratings_select_own" on public.appointment_ratings
  for select using (owns_appointment(appointment_id));

create function public.rate_public_appointment(
  p_slug text,
  p_appointment_id uuid,
  p_telefone text,
  p_nota smallint,
  p_comentario text
)
returns public.appointment_ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_appointment appointments%rowtype;
  v_client clients%rowtype;
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

  insert into appointment_ratings (appointment_id, nota, comentario)
  values (p_appointment_id, p_nota, p_comentario)
  on conflict (appointment_id) do update set nota = excluded.nota, comentario = excluded.comentario
  returning * into v_rating;

  return v_rating;
end;
$$;

revoke all on function public.rate_public_appointment(text, uuid, text, smallint, text) from public;
grant execute on function public.rate_public_appointment(text, uuid, text, smallint, text) to anon, authenticated;
