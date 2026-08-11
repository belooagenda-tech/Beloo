-- Beloo — meta de faturamento mensal, definida pelo profissional direto no
-- Financeiro (barra de progresso + comparação com o mês anterior).

alter table public.businesses add column meta_faturamento_mensal numeric(10, 2);
