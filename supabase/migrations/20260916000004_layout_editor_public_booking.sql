-- Beloo — Editor Visual: página pública de agendamento ("public-booking").
-- Mesmo modelo de blocos de texto/imagem já usado nas 13 telas internas
-- (20260916000002_layout_editor_app_pages.sql), só que essa é a vitrine
-- pública que cada profissional compartilha com os próprios clientes — os
-- blocos publicados aqui aparecem em TODAS elas ao mesmo tempo (é conteúdo
-- da marca Beloo, não configuração por-loja). Ver
-- src/lib/layout-editor/pages.ts e src/app/[slug]/page.tsx.

insert into public.layout_drafts (page_key) values ('public-booking')
  on conflict (page_key) do nothing;
