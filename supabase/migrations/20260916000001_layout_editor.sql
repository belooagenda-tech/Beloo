-- Beloo — Editor Visual de Layout
-- Dá a usuários marcados como "layout editor" (equipe de marketing/vendas)
-- acesso a uma aba /app/editor onde editam tema global + conteúdo da landing
-- page em modo rascunho. Só o admin (is_admin) publica. Nenhuma tabela de
-- negócio existente é tocada — isso é 100% aditivo.

-- ============================================================================
-- profiles.is_layout_editor — acesso à aba Editor. Concedido pelo admin pela
-- tela /app/admin (ver setLayoutEditorAction). Independente de is_admin: todo
-- admin também tem acesso ao Editor (checado em código), mas nem todo layout
-- editor é admin — só quem é admin publica.
-- ============================================================================
alter table public.profiles add column is_layout_editor boolean not null default false;
comment on column public.profiles.is_layout_editor is
  'Acesso à aba Editor (layout visual da Beloo). Concedido pelo admin em /app/admin.';

update public.profiles
  set is_layout_editor = true
  where email in ('gabrielcogabriel93@gmail.com', 'cleytonmarcello2@gmail.com');

-- ============================================================================
-- layout_drafts — 1 linha por "página editável" (ver src/lib/layout-editor/pages.ts).
-- draft_content é onde os editores mexem; published_content é o que o app
-- realmente renderiza para todo mundo. Igual ao padrão de saas_subscriptions
-- (ver 20260804000001_saas_billing.sql): RLS ligado, sem nenhuma policy para
-- authenticated/anon — toda leitura (landing pública, tema global) e toda
-- escrita passam por Server Components/Actions usando createAdminClient(),
-- que verificam is_admin/is_layout_editor em código antes de tocar na tabela.
-- ============================================================================
create table public.layout_drafts (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz
);

alter table public.layout_drafts enable row level security;

insert into public.layout_drafts (page_key) values ('global-theme'), ('landing')
  on conflict (page_key) do nothing;

-- ============================================================================
-- Storage — bucket "layout-assets" para imagens usadas pelo Editor (ex.
-- blocos de imagem inseridos na landing). Mesmo padrão de "logos"/
-- "product-images": bucket público (a landing é pública), escrita restrita.
-- Caminho: "<page_key>/<uuid>.<ext>".
-- ============================================================================
create function public.is_layout_editor_or_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin or p.is_layout_editor)
  );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('layout-assets', 'layout-assets', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "layout_assets_public_read" on storage.objects
  for select using (bucket_id = 'layout-assets');

create policy "layout_assets_editor_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'layout-assets' and is_layout_editor_or_admin());

create policy "layout_assets_editor_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'layout-assets' and is_layout_editor_or_admin())
  with check (bucket_id = 'layout-assets' and is_layout_editor_or_admin());

create policy "layout_assets_editor_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'layout-assets' and is_layout_editor_or_admin());
