import { CalendarClock, Link2, Sparkles } from "lucide-react";

const PASSOS = [
  {
    numero: "1",
    icon: CalendarClock,
    titulo: "Configure sua agenda",
    descricao:
      "Cadastre seus serviços, defina seus horários de atendimento e pronto — sua agenda já está pronta pra receber clientes.",
  },
  {
    numero: "2",
    icon: Link2,
    titulo: "Compartilhe seu link",
    descricao:
      "Cada loja ganha um link só dela (beloo.app/sua-loja). Coloca no Instagram, no WhatsApp, onde quiser.",
  },
  {
    numero: "3",
    icon: Sparkles,
    titulo: "Receba agendamentos",
    descricao:
      "Seus clientes escolhem o serviço e o horário sozinhos. Você recebe a notificação e já vê tudo organizado no seu dia.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-secondary/30 px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-3 text-muted-foreground">
            Três passos entre você e uma agenda cheia.
          </p>
        </div>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
          {PASSOS.map((passo) => (
            <div key={passo.numero} className="relative flex flex-col items-center text-center">
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <passo.icon className="size-7" />
                <span className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-coral text-xs font-semibold text-coral-foreground">
                  {passo.numero}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">
                {passo.titulo}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{passo.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
