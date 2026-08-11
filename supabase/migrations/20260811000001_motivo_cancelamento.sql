-- Beloo — motivo do cancelamento, preenchido pelo profissional ao cancelar
-- um agendamento pela Agenda. Fica visível pro cliente quando ele busca o
-- histórico de agendamentos pelo link público (não é obrigatório: cancelamentos
-- feitos pelo próprio cliente, ou sem motivo informado, ficam null).

alter table public.appointments add column motivo_cancelamento text;
