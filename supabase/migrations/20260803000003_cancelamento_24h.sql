-- Beloo — novo padrão de antecedência mínima para cancelamento pelo
-- cliente: 24 horas (antes era 2h, um valor que nunca tinha UI própria
-- para o profissional editar).

alter table public.businesses
  alter column cancelamento_min_horas set default 24;

-- Lojas que ainda estão no valor antigo (2h, o default anterior) e
-- nunca tiveram como editar isso pela UI passam a usar o novo padrão.
-- Se algum dia alguém customizar esse campo, este update deixa de
-- afetá-lo (só atinge quem ainda está exatamente em 2).
update public.businesses set cancelamento_min_horas = 24 where cancelamento_min_horas = 2;
