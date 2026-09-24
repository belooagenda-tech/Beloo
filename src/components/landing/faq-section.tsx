import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@/components/ui/accordion";

const PERGUNTAS = [
  {
    pergunta: "Preciso saber tecnologia pra usar?",
    resposta:
      "Não. Você cadastra seus serviços e horários em poucos minutos, direto pelo celular ou computador, sem precisar instalar nada.",
  },
  {
    pergunta: "Como o cliente agenda?",
    resposta:
      "Você compartilha seu link (beloo.app/sua-loja) nas redes sociais ou no WhatsApp. O cliente escolhe o serviço, o horário e confirma sozinho — sem precisar te chamar.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta:
      "Sim, sem multa e sem burocracia. O plano Grátis não tem prazo nenhum, e os planos pagos podem ser cancelados a qualquer momento em Assinatura.",
  },
  {
    pergunta: "O que acontece se eu passar do limite do plano Grátis?",
    resposta:
      "Você é avisado assim que chegar perto do limite de 30 agendamentos no mês. Pra continuar recebendo sem parar, é só fazer upgrade pro Pro.",
  },
  {
    pergunta: "Dá pra ter mais de um profissional na mesma agenda?",
    resposta:
      "Sim, no plano Studio. Cada profissional pode ter horários próprios, e o cliente escolhe com quem quer agendar direto na sua página.",
  },
];

export function FaqSection() {
  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>
        <Accordion className="mt-10" multiple>
          {PERGUNTAS.map((item) => (
            <AccordionItem key={item.pergunta} value={item.pergunta}>
              <AccordionTrigger>{item.pergunta}</AccordionTrigger>
              <AccordionPanel>{item.resposta}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
