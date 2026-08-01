import { Bell, CalendarDays, Repeat, Smartphone, Wallet } from "lucide-react";

const FUNCIONALIDADES = [
  {
    icon: CalendarDays,
    titulo: "Agenda inteligente",
    descricao:
      "Os horários livres são calculados na hora, considerando a duração de cada serviço — sem risco de dois clientes no mesmo horário.",
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
    icon: Bell,
    titulo: "Notificações",
    descricao:
      "Você recebe um aviso assim que um agendamento chega, e seus clientes podem receber lembretes antes do horário.",
  },
  {
    icon: Smartphone,
    titulo: "Funciona em qualquer dispositivo",
    descricao:
      "Celular, tablet ou computador — a Beloo se adapta à tela, e dá pra instalar como um app de verdade.",
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
          {FUNCIONALIDADES.map((item, index) => (
            <div
              key={item.titulo}
              className={`rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40 ${
                index === FUNCIONALIDADES.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
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
