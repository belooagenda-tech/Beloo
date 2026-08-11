-- Beloo — vitrine de produtos: o profissional cadastra o que vende (além dos
-- serviços) e o cliente pode adicionar ao agendamento pelo link público.
--
-- Propositalmente separado de `services`: produto não ocupa duração na
-- agenda, então misturar as duas tabelas obrigaria services.duracao_min a
-- virar opcional e toda a lógica de disponibilidade (available-slots.ts) a
-- filtrar "isso é serviço mesmo?" em todo lugar. Duas tabelas pequenas e
-- independentes é mais simples de entender e não arrisca nada do que já
-- funciona no motor de agenda.

-- ============================================================================
-- products — o que a loja vende além dos serviços
-- ============================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  imagem_url text,
  ativo boolean not null default true,
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

create index products_business_id_idx on public.products (business_id);

alter table public.products enable row level security;

create policy "products_select_own" on public.products
  for select using (owns_business(business_id));

create policy "products_insert_own" on public.products
  for insert with check (owns_business(business_id));

create policy "products_update_own" on public.products
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "products_delete_own" on public.products
  for delete using (owns_business(business_id));

-- ============================================================================
-- appointment_products — produtos adicionados a um agendamento (N por
-- agendamento, diferente de appointment_payments que é 1:1). Guarda nome e
-- preço no momento da venda (snapshot): se o profissional editar ou apagar o
-- produto depois, o histórico de vendas antigas não muda — mesmo cuidado já
-- tomado com client_plans.servicos_inclusos.
-- ============================================================================
create table public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  nome_snapshot text not null,
  preco_snapshot numeric(10, 2) not null check (preco_snapshot >= 0),
  quantidade smallint not null default 1 check (quantidade > 0),
  created_at timestamptz not null default now()
);

create index appointment_products_appointment_id_idx on public.appointment_products (appointment_id);
create index appointment_products_product_id_idx on public.appointment_products (product_id);

alter table public.appointment_products enable row level security;

-- Mesmo padrão de appointment_payments: só o dono do agendamento (via
-- owns_appointment) acessa pelo client autenticado. A escrita no fluxo
-- público continua vindo de dentro da RPC create_public_appointment
-- (security definer, abaixo), que ignora RLS por natureza.
create policy "appointment_products_select_own" on public.appointment_products
  for select using (owns_appointment(appointment_id));

create policy "appointment_products_insert_own" on public.appointment_products
  for insert with check (owns_appointment(appointment_id));

create policy "appointment_products_update_own" on public.appointment_products
  for update using (owns_appointment(appointment_id)) with check (owns_appointment(appointment_id));

create policy "appointment_products_delete_own" on public.appointment_products
  for delete using (owns_appointment(appointment_id));

-- ============================================================================
-- storage — fotos dos produtos, mesmo padrão do bucket "logos" (leitura
-- pública, escrita só pelo dono), já criado com os limites de tamanho/tipo
-- que "logos" só ganhou depois, numa migration corretiva.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "product_images_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'product-images'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "product_images_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

-- ============================================================================
-- create_public_appointment — ganha um parâmetro opcional de produtos.
-- Validado inteiramente no servidor: o cliente só manda product_id +
-- quantidade, o preço e o nome vêm sempre da tabela `products` no momento da
-- gravação (nunca confiamos em preço vindo do browser) e só produtos ativos
-- da MESMA loja entram — um id de outra loja ou de um produto desativado é
-- silenciosamente ignorado, não derruba o agendamento.
-- ============================================================================
drop function if exists public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer
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
  p_produtos jsonb default '[]'::jsonb
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
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer, jsonb
) from public;
grant execute on function public.create_public_appointment(
  text, uuid, timestamptz, text, text, boolean, numeric, timestamptz, integer, jsonb
) to anon, authenticated;
