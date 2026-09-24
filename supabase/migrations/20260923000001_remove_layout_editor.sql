-- Beloo — remove o Editor Visual (reverte 20260916000001/02/04)
-- Feature descontinuada: tentativa de editor de layout visual que não deu
-- certo. Reverte tudo que foi criado para ela — nada mais no produto
-- depende dessas tabelas/colunas/bucket.

drop policy if exists "layout_assets_editor_delete" on storage.objects;
drop policy if exists "layout_assets_editor_update" on storage.objects;
drop policy if exists "layout_assets_editor_insert" on storage.objects;
drop policy if exists "layout_assets_public_read" on storage.objects;

-- Sem policy nenhuma sobrando, o bucket "layout-assets" já fica inacessível
-- (RLS de storage.objects nega tudo por padrão sem policy). Não apagamos o
-- bucket/objetos aqui de propósito: o Supabase bloqueia delete direto em
-- storage.objects via SQL ("Direct deletion from storage tables is not
-- allowed. Use the Storage API instead.") — é só storage órfã, sem custo
-- funcional, já que nenhum código do produto lê/escreve nele mais. Pra
-- limpar de vez, exclua o bucket "layout-assets" pelo painel do Supabase
-- (Storage), que usa a Storage API por baixo.

drop function if exists public.is_layout_editor_or_admin();

drop table if exists public.layout_drafts;

alter table public.profiles drop column if exists is_layout_editor;
