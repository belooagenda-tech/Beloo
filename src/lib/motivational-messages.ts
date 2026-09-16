// Mensagens motivacionais diárias enviadas por push aos profissionais (ver
// sendDailyMotivationalMessages em src/app/api/cron/reminders/route.ts).
// Propositalmente genéricas — servem pra qualquer profissão cadastrada na
// Beloo, não só salão/estética. Uma por dia, na ordem, repetindo em loop.
export const MOTIVATIONAL_MESSAGES: string[] = [
  "Bom dia! Hoje é uma nova chance de fazer um trabalho do qual você se orgulha. Vai dar tudo certo.",
  "Cada cliente que você atende hoje sai um pouco melhor do que chegou — isso é o seu trabalho, e ele importa.",
  "Você não precisa ter o dia perfeito, só precisa começar. O resto vai se encaixando.",
  "Respira fundo, organiza a agenda e vai com calma — um atendimento de cada vez.",
  "O seu trabalho de hoje é o resultado de anos aprendendo o que faz. Confie na sua experiência.",
  "Todo cliente satisfeito hoje é uma indicação amanhã. Capricha, o esforço sempre volta.",
  "Dias difíceis também formam profissionais melhores. Segue em frente, você está no caminho certo.",
  "Hoje é um bom dia pra fazer o simples muito bem feito.",
  "Sua dedicação de hoje é invisível pra maioria, mas não pra quem você atende.",
  "Não compare seu começo com o meio da jornada de outra pessoa. Você está exatamente onde precisa estar.",
  "Um sorriso genuíno no atendimento vale mais do que qualquer técnica. Leve o seu com você hoje.",
  "Você escolheu um trabalho que cuida das pessoas — isso é raro e valioso. Orgulhe-se disso.",
  "Hoje pode ser o dia que muda a rotina de alguém pra melhor. Você tem esse poder.",
  "Cansaço é sinal de que você está construindo algo. Descanse quando puder, mas não desista.",
  "Seja gentil consigo mesmo(a) hoje — profissional bom também erra e aprende.",
  "A confiança que você passa pro seu cliente começa na confiança que você tem em si.",
  "Cada agenda cheia começou um dia com uma agenda vazia. Continue construindo a sua.",
  "Organize o que der pra organizar, e deixe o resto fluir. Você dá conta.",
  "O seu cuidado com os detalhes é o que te diferencia. Ninguém nota até sentir falta.",
  "Hoje é dia de fazer o que você sabe fazer bem, sem se cobrar demais pelo resto.",
  "Pequenos gestos de atenção fazem toda a diferença no seu atendimento hoje.",
  "Você já superou dias mais difíceis que hoje. Vai dar certo de novo.",
  "Trabalhar com o que se gosta tem seu peso, mas também sua recompensa. Aproveite os dois lados.",
  "Cada cliente fiel começou como um primeiro atendimento bem feito. Continue assim.",
  "Não é sobre ser perfeito(a) hoje, é sobre estar presente em cada atendimento.",
  "Sua reputação se constrói um dia de cada vez — e hoje é mais um tijolo bem colocado.",
  "Cuide de quem você atende hoje como gostaria de ser cuidado(a).",
  "O seu esforço de hoje talvez não apareça agora, mas ele se acumula. Continue.",
  "Um bom dia de trabalho começa com um bom começo de manhã. Você já deu o primeiro passo.",
  "Hoje, celebre as pequenas vitórias: um cliente satisfeito já é motivo de orgulho.",
];

export function pickMotivationalMessage(dayIndex: number): string {
  const index = ((dayIndex % MOTIVATIONAL_MESSAGES.length) + MOTIVATIONAL_MESSAGES.length) % MOTIVATIONAL_MESSAGES.length;
  return MOTIVATIONAL_MESSAGES[index];
}
