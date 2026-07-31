-- Beloo — helpers de onboarding
-- RLS em `businesses` esconde slugs de outros donos, então uma query normal
-- nunca detectaria um slug já usado por outra loja. Esta função checa
-- unicidade globalmente sem expor nenhum outro dado da tabela.

create function public.is_slug_available(candidate_slug text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (
    select 1 from public.businesses where slug = candidate_slug
  );
$$;

revoke all on function public.is_slug_available(text) from public;
grant execute on function public.is_slug_available(text) to anon, authenticated;
