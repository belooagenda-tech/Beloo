-- Beloo — lembretes de vencimento da assinatura da própria plataforma
-- (trial acabando ou renovação sem cartão configurado). Ver
-- /api/cron/saas-billing-reminders.

alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando'
    )
  );
