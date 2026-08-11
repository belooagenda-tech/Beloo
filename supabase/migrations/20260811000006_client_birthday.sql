-- Beloo — data de nascimento do cliente (opcional), usada pro relatório de
-- aniversariantes em Clientes (reengajamento sazonal, mesmo espírito da aba
-- "Inativos").

alter table public.clients add column data_nascimento date;
