-- Beloo — mensagem de lembrete do WhatsApp personalizável pelo profissional
-- em Configurações. Null = usa o texto padrão (ver DEFAULT_REMINDER_TEMPLATE
-- em src/lib/whatsapp.ts).

alter table public.businesses add column whatsapp_lembrete_template text;
