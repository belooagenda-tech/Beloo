import { CalendarDays, MessageCircle, Repeat, Wallet } from "lucide-react";

const FUNCIONALIDADES = [
  {
    icon: CalendarDays,
    titulo: "Agenda inteligente",
    descricao:
      "Os horários livres são calculados na hora, considerando a duração de cada serviço. Confirme, conclua ou cancele com um toque.",
  },
  {
    icon: MessageCircle,
    titulo: "Lembretes automáticos",
    descricao:
      "Seus clientes recebem um lembrete antes do horário, sem você precisar mandar mensagem um por um.",
  },
  {
    icon: Wallet,
    titulo: "Pagamento online",
    descricao:
      "Cobre uma entrada ou o valor cheio antes do atendimento, com link gerado na hora, direto na sua conta.",
  },
  {
    icon: Repeat,
    titulo: "Planos para clientes",
    descricao:
      "Venda pacotes recorrentes pros seus clientes fiéis e deixe a Beloo controlar os créditos usados.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa para agendar
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sem depender de vários apps e planilhas soltas.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FUNCIONALIDADES.map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
