-- Beloo — link do Instagram e link de avaliação do Google Meu Negócio,
-- configurados pelo profissional em Configurações. Usados pra incentivar o
-- cliente a avaliar também fora do app, no momento em que ele acabou de
-- avaliar o atendimento pelo link público (ver rate-appointment-dialog.tsx).

alter table public.businesses add column instagram_url text;
alter table public.businesses add column google_review_url text;
