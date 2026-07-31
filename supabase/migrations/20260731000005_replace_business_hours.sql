-- Beloo — substitui os blocos de disponibilidade semanal de uma loja
-- numa única transação (evita ficar com a agenda vazia se o insert falhar
-- depois do delete).

create function public.replace_business_hours(p_business_id uuid, p_hours jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  if not owns_business(p_business_id) then
    raise exception 'not authorized';
  end if;

  delete from public.business_hours where business_id = p_business_id;

  insert into public.business_hours (business_id, dia_semana, hora_inicio, hora_fim)
  select
    p_business_id,
    (elem ->> 'dia_semana')::smallint,
    (elem ->> 'hora_inicio')::time,
    (elem ->> 'hora_fim')::time
  from jsonb_array_elements(p_hours) as elem;
end;
$$;

revoke all on function public.replace_business_hours(uuid, jsonb) from public;
grant execute on function public.replace_business_hours(uuid, jsonb) to authenticated;
