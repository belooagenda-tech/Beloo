-- Beloo — impede que uma loja escolha um slug que colida com uma rota
-- estática do app (ex: "entrar" tornaria beloo.app/entrar ambíguo e a
-- loja ficaria inacessível, já que a rota estática sempre tem prioridade).

alter table public.businesses
  add constraint slug_not_reserved check (
    slug not in (
      'entrar', 'criar-agenda', 'app', 'api',
      'icon.svg', 'manifest.json', 'favicon.ico', 'sw.js',
      'robots.txt', 'sitemap.xml', '_next'
    )
  );

create or replace function public.is_slug_available(candidate_slug text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    candidate_slug not in (
      'entrar', 'criar-agenda', 'app', 'api',
      'icon.svg', 'manifest.json', 'favicon.ico', 'sw.js',
      'robots.txt', 'sitemap.xml', '_next'
    )
    and not exists (
      select 1 from public.businesses where slug = candidate_slug
    );
$$;
