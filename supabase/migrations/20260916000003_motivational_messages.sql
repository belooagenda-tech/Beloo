-- Beloo — mensagem motivacional diária pros profissionais (push, 07:00 no
-- fuso de cada loja). Ver sendDailyMotivationalMessages em
-- src/app/api/cron/reminders/route.ts.

alter table public.notifications drop constraint notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check check (
    tipo in (
      'novo_agendamento', 'cancelamento', 'lembrete_dia', 'entrada_paga',
      'plano_pago', 'assinatura_expirando', 'reagendamento', 'avaliacao_recebida',
      'lista_espera', 'novo_profissional', 'divulgador_recuperacao_senha',
      'mensagem_suporte', 'mensagem_motivacional'
    )
  );
