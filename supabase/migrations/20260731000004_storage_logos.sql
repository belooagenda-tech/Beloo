-- Beloo — storage para logo/foto da loja
-- Caminho do arquivo: "<business_id>/logo.<ext>". Leitura pública (a logo
-- aparece na página pública de agendamento), escrita só pelo dono da loja.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "logos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'logos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );

create policy "logos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and name ~ '^[0-9a-f-]{36}/'
    and owns_business((split_part(name, '/', 1))::uuid)
  );
