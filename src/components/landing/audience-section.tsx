import { Eye, Hand, Palette, Scissors, Sparkles, Users } from "lucide-react";

const PUBLICO = [
  { label: "Manicures", icon: Hand },
  { label: "Sobrancelheiras", icon: Eye },
  { label: "Cabeleireiros(as)", icon: Scissors },
  { label: "Barbeiros", icon: Users },
  { label: "Esteticistas", icon: Sparkles },
  { label: "Maquiadoras(es)", icon: Palette },
];

export function AudienceSection() {
  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Para quem é a Beloo
          </h2>
          <p className="mt-3 text-muted-foreground">
            Se você atende clientes com hora marcada, a Beloo foi feita pra você.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {PUBLICO.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-center transition-colors hover:border-primary/40"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <item.icon className="size-5" />
              </span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
