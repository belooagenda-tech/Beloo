import { Eye, Hand, Palette, Scissors, Sparkles, Users } from "lucide-react";

const PUBLICO = [
  { label: "Manicures", icon: Hand, gradient: "from-primary/80 to-primary-strong" },
  { label: "Sobrancelheiras", icon: Eye, gradient: "from-coral/80 to-primary" },
  { label: "Cabeleireiros(as)", icon: Scissors, gradient: "from-primary-strong to-coral" },
  { label: "Barbeiros", icon: Users, gradient: "from-primary/70 to-coral/80" },
  { label: "Esteticistas", icon: Sparkles, gradient: "from-coral to-primary-strong" },
  { label: "Maquiadoras(es)", icon: Palette, gradient: "from-primary-strong to-primary/70" },
];

export function AudienceSection() {
  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Feito para quem cuida da beleza todos os dias
          </h2>
          <p className="mt-3 text-muted-foreground">
            Se você atende clientes com hora marcada, a Beloo foi feita pra você.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {PUBLICO.map((item) => (
            <div
              key={item.label}
              className={`relative flex aspect-4/3 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-br ${item.gradient} text-center shadow-sm`}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                <item.icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-white">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
