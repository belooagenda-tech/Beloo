import { normalizePhone } from "./phone";

// Monta um link `wa.me` com o número do cliente e uma mensagem pronta — o
// profissional só confirma e aperta enviar no próprio WhatsApp dele. Não é a
// API oficial do WhatsApp Business (isso enviaria sozinho, sem clique); esse
// link é gratuito e não depende de nenhuma integração/custo por mensagem.
export function buildWhatsAppLink(telefone: string, mensagem: string): string {
  // Telefones armazenados já vêm sem DDI (10 ou 11 dígitos — ver
  // isValidBrazilianPhone em src/lib/phone.ts), então sempre prefixamos 55.
  const digits = normalizePhone(telefone);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`;
}

export function buildAppointmentReminderMessage(params: {
  clienteNome: string;
  servicoNome: string;
  nomeLoja: string;
  dataHoraFormatada: string;
}): string {
  const { clienteNome, servicoNome, nomeLoja, dataHoraFormatada } = params;
  return `Oi, ${clienteNome}! Passando para lembrar do seu horário de ${servicoNome} em ${nomeLoja}, dia ${dataHoraFormatada}. Até lá! 😊`;
}

export function buildPlanRenewalMessage(params: {
  clienteNome: string;
  planoNome: string;
  nomeLoja: string;
  dataRenovacaoFormatada: string;
}): string {
  const { clienteNome, planoNome, nomeLoja, dataRenovacaoFormatada } = params;
  return `Oi, ${clienteNome}! Seu plano ${planoNome} em ${nomeLoja} vence em ${dataRenovacaoFormatada}. Vamos renovar? 😊`;
}
