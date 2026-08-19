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

// Placeholders aceitos: {cliente}, {servico}, {loja}, {data_hora}. Qualquer
// chave desconhecida (ou erro de digitação nas chaves) fica como texto
// literal em vez de sumir ou quebrar a mensagem.
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export const DEFAULT_REMINDER_TEMPLATE =
  "Oi, {cliente}! Passando para lembrar do seu horário de {servico} em {loja}, dia {data_hora}. Até lá! 😊";

export function buildAppointmentReminderMessage(params: {
  clienteNome: string;
  servicoNome: string;
  nomeLoja: string;
  dataHoraFormatada: string;
  // Link pra "Meus agendamentos" do cliente — quando informado, evita ele
  // ter que pedir pro profissional remarcar/cancelar por fora do app. Fica
  // sempre no fim da mensagem, fora do template (não editável pelo
  // profissional), pra nunca sumir sem querer.
  linkGerenciar?: string;
  // Template customizado pelo profissional em Configurações — null/vazio usa
  // DEFAULT_REMINDER_TEMPLATE.
  template?: string | null;
}): string {
  const { clienteNome, servicoNome, nomeLoja, dataHoraFormatada, linkGerenciar, template } = params;
  const vars = {
    cliente: clienteNome,
    servico: servicoNome,
    loja: nomeLoja,
    data_hora: dataHoraFormatada,
  };
  const corpo = renderTemplate(template?.trim() ? template : DEFAULT_REMINDER_TEMPLATE, vars);
  if (!linkGerenciar) return corpo;
  return `${corpo}\n\nPrecisa remarcar ou cancelar? ${linkGerenciar}`;
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

// Mensagem de reengajamento pro Admin da Beloo chamar um profissional
// (dono de loja/tenant do SaaS) que assinou mas nunca configurou nada, ou
// configurou e nunca recebeu agendamento — usada no botão de WhatsApp da
// tabela de profissionais (ver app/app/admin/professionals-table.tsx). Uma
// terceira variante cobre quem já está ativo, pra manter a mesma conexão
// (o pedido não era só "cutucar quem parou", era mostrar cuidado com todo
// mundo).
export type StatusUsoProfissional = "sem_configuracao" | "configurado_sem_uso" | "ativo";

export function buildOutreachMessage(status: StatusUsoProfissional, nomeLoja: string): string {
  if (status === "sem_configuracao") {
    return `Oi! Aqui é a equipe do Beloo 👋 Vi que a ${nomeLoja} criou a conta mas ainda não chegou a cadastrar os serviços. Rolou alguma dificuldade? O Beloo foi feito pra facilitar o dia a dia — agenda online, lembrete automático pros clientes, controle financeiro — e a gente quer muito te ajudar a deixar tudo pronto. Posso te ajudar agora, é rapidinho? 😊`;
  }
  if (status === "configurado_sem_uso") {
    return `Oi! Aqui é a equipe do Beloo 👋 Vi que a ${nomeLoja} já configurou a agenda, mas ainda não recebeu nenhum agendamento por aqui. Queria entender se travou algo no caminho — o app foi pensado pra dar mais controle pro seu dia a dia, e a gente quer muito ver isso funcionando pra você. Posso ajudar a destravar? 💜`;
  }
  return `Oi! Aqui é a equipe do Beloo 👋 Vi que a ${nomeLoja} já está usando o app no dia a dia — que bom! Só passando pra saber se está tudo certo e se tem alguma sugestão ou dúvida. Qualquer coisa, é só chamar. 😊`;
}
