import { BarChart3, Bell, CalendarDays, MessageCircle, Repeat, Smartphone, Star, Wallet } from "lucide-react";

const FUNCIONALIDADES = [
  {
    icon: CalendarDays,
    titulo: "Agenda inteligente",
    descricao:
      "Os horários livres são calculados na hora, considerando a duração de cada serviço. Veja o dia em lista ou em grade, e confirme, conclua ou cancele com um toque — sem menus escondidos.",
  },
  {
    icon: MessageCircle,
    titulo: "Lembretes no WhatsApp",
    descricao:
      "Lembre o cliente do horário e chame quem sumiu de volta, direto pelo WhatsApp, com a mensagem já pronta.",
  },
  {
    icon: Wallet,
    titulo: "Controle de pagamentos",
    descricao:
      "Dê baixa em cada atendimento, registre a forma de pagamento e acompanhe seu faturamento sem precisar de planilha.",
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
      "Seu cliente remarca, cancela e avalia o atendimento sozinho, pelo mesmo link — e você é avisado na hora de cada avaliação recebida.",
  },
  {
    icon: BarChart3,
    titulo: "Relatórios financeiros",
    descricao:
      "Gráficos de faturamento por período, serviço e forma de pagamento, com exportação em CSV pra sua contabilidade.",
  },
  {
    icon: Bell,
    titulo: "Notificações em tempo real",
    descricao:
      "Você recebe um aviso assim que um agendamento chega, é cancelado ou remarcado — e seus clientes recebem lembretes antes do horário.",
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
