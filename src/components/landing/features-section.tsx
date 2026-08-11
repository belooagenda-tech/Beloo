import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  Gift,
  MessageCircle,
  QrCode,
  Repeat,
  ShoppingBag,
  Smartphone,
  Star,
  Wallet,
} from "lucide-react";

const FUNCIONALIDADES = [
  {
    icon: CalendarDays,
    titulo: "Agenda inteligente",
    descricao:
      "Os horários livres são calculados na hora, considerando a duração de cada serviço. Veja o dia em lista ou em grade, bloqueie horários recorrentes (folga fixa, almoço) e confirme, conclua ou cancele com um toque.",
  },
  {
    icon: ShoppingBag,
    titulo: "Vitrine de produtos",
    descricao:
      "Cadastre o que você vende além dos serviços e deixe o cliente adicionar ao agendamento — shampoo, óleo, kit de finalização. O valor entra junto na conta, sem misturar com sua agenda de horários.",
  },
  {
    icon: MessageCircle,
    titulo: "WhatsApp com mensagem pronta",
    descricao:
      "Lembre o cliente do horário, chame quem sumiu de volta ou avise sobre um horário livre na lista de espera — tudo com um link que já abre o WhatsApp com o texto certo.",
  },
  {
    icon: Wallet,
    titulo: "Pagamento online (Mercado Pago)",
    descricao:
      "Cobre uma entrada ou o valor cheio antes do atendimento, com link gerado na hora — direto na sua conta, sem precisar ficar cobrando de novo pessoalmente.",
  },
  {
    icon: Repeat,
    titulo: "Planos para clientes",
    descricao:
      "Venda pacotes recorrentes pros seus clientes fiéis e deixe a Beloo controlar os créditos usados automaticamente.",
  },
  {
    icon: Star,
    titulo: "Reagendamento e avaliações",
    descricao:
      "Seu cliente remarca, cancela e avalia o atendimento sozinho, pelo mesmo link — você é avisado na hora e ainda pode convidar quem avaliou bem a te seguir no Instagram ou avaliar no Google.",
  },
  {
    icon: BarChart3,
    titulo: "Relatórios financeiros",
    descricao:
      "Faturamento por período, serviço, produto e forma de pagamento, com exportação em CSV e relatório pronto pra imprimir.",
  },
  {
    icon: Gift,
    titulo: "Clientes aniversariantes",
    descricao:
      "Veja quem faz aniversário no mês e mande uma mensagem especial pelo WhatsApp — um jeito simples de fidelizar sem precisar lembrar de nada.",
  },
  {
    icon: CalendarClock,
    titulo: "Lista de espera",
    descricao:
      "Sua agenda lotou? O cliente entra na lista de espera sozinho, e você chama pelo WhatsApp assim que um horário abrir.",
  },
  {
    icon: QrCode,
    titulo: "QR Code pra divulgar na loja",
    descricao:
      "Gere um QR Code personalizado do seu link de agendamento e imprima pra deixar no balcão — o cliente só aponta a câmera e já cai direto na sua agenda.",
  },
  {
    icon: Bell,
    titulo: "Notificações em tempo real",
    descricao:
      "Você recebe um aviso assim que um agendamento chega, é cancelado, remarcado ou avaliado — e seus clientes recebem lembretes antes do horário.",
  },
  {
    icon: Smartphone,
    titulo: "Funciona em qualquer dispositivo",
    descricao:
      "Celular, tablet ou computador — a Beloo se adapta à tela, e dá pra instalar como um app de verdade, sem precisar baixar nada.",
  },
];

export function FeaturesSection() {
  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa, num só lugar
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sem depender de vários apps e planilhas soltas.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONALIDADES.map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
                {item.titulo}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
