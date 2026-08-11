-- Beloo — novo tipo de notificação: avisa os admins da plataforma (profiles
-- com is_admin = true) quando um novo profissional termina de criar a loja.

alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento',
      'avaliacao_recebida', 'lista_espera', 'novo_profissional'
    )
  );
