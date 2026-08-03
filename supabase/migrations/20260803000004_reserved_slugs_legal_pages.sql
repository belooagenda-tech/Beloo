-- Beloo — /privacidade e /termos são novas rotas estáticas; precisam
-- entrar na lista de slugs reservados pelo mesmo motivo das anteriores.

alter table public.businesses drop constraint slug_not_reserved;

alter table public.businesses
  add constraint slug_not_reserved check (
    slug not in (
      'entrar', 'criar-agenda', 'app', 'api', 'auth', 'offline',
      'esqueci-senha', 'redefinir-senha', 'privacidade', 'termos',
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
      'esqueci-senha', 'redefinir-senha', 'privacidade', 'termos',
      'icon.svg', 'manifest.json', 'favicon.ico', 'sw.js',
      'robots.txt', 'sitemap.xml', '_next'
    )
    and not exists (
      select 1 from public.businesses where slug = candidate_slug
    );
$$;
