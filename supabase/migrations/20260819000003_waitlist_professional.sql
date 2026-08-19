-- Beloo — lista de espera ganha profissional desejado (opcional), mesmo
-- espírito da Equipe: só relevante quando o serviço escolhido já tem
-- profissional vinculado (ver professional_services); senão fica null e a
-- entrada na fila continua exatamente como antes.

alter table public.waitlist_entries
  add column professional_id uuid references public.professionals (id) on delete set null;
