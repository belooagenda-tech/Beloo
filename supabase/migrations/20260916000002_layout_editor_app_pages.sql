-- Beloo — Editor Visual: blocos de texto/imagem nas telas internas do app
-- Estende o Editor Visual (20260916000001_layout_editor.sql) para as 13
-- telas internas de /app/**. Nessas telas o editor só insere blocos de texto
-- ou imagem antes/depois do conteúdo funcional (tabela, agenda, formulário)
-- — nunca dentro dele. Ver src/lib/layout-editor/pages.ts e
-- src/lib/layout-editor/blocks-schema.ts para o formato de draft_content.

insert into public.layout_drafts (page_key) values
  ('app-painel'),
  ('app-primeiros-passos'),
  ('app-agenda'),
  ('app-servicos'),
  ('app-produtos'),
  ('app-equipe'),
  ('app-disponibilidade'),
  ('app-clientes'),
  ('app-planos'),
  ('app-financeiro'),
  ('app-configuracoes'),
  ('app-assinatura'),
  ('app-suporte')
on conflict (page_key) do nothing;
