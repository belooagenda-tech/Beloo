-- Beloo — as rotas /auth, /offline, /esqueci-senha e /redefinir-senha
-- foram criadas depois da migration original de slugs reservados e
-- nunca entraram na lista, deixando uma loja escolher um desses slugs
-- e ficar inacessível.

alter table public.businesses drop constraint slug_not_reserved;

alter table public.businesses
  add constraint slug_not_reserved check (
    slug not in (
      'entrar', 'criar-agenda', 'app', 'api', 'auth', 'offline',
      'esqueci-senha', 'redefinir-senha',
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
      'entrar', 'criar-agenda', 'app', 'api', 'auth', 'offline',
      'esqueci-senha', 'redefinir-senha',
      'icon.svg', 'manifest.json', 'favicon.ico', 'sw.js',
      'robots.txt', 'sitemap.xml', '_next'
    )
    and not exists (
      select 1 from public.businesses where slug = candidate_slug
    );
$$;
