import { Eye, Hand, Palette, Scissors, Sparkles, Users } from "lucide-react";
import { resolveIcon } from "@/lib/layout-editor/icons";
import type { LandingContent } from "@/lib/layout-editor/landing-schema";

export const AUDIENCE_DEFAULTS = {
  title: "Para quem é a Beloo",
  subtitle: "Se você atende clientes com hora marcada, a Beloo foi feita pra você.",
  items: [
    { id: "manicures", label: "Manicures", icon: Hand },
    { id: "sobrancelheiras", label: "Sobrancelheiras", icon: Eye },
    { id: "cabeleireiros", label: "Cabeleireiros(as)", icon: Scissors },
    { id: "barbeiros", label: "Barbeiros", icon: Users },
    { id: "esteticistas", label: "Esteticistas", icon: Sparkles },
    { id: "maquiadoras", label: "Maquiadoras(es)", icon: Palette },
  ],
};

// Mesmos itens de AUDIENCE_DEFAULTS.items, mas com a chave de ícone (string)
// em vez do componente — é o que o Editor Visual usa pra pré-popular a lista
// editável com o conteúdo atual (ver landing-editor.tsx).
export const AUDIENCE_ITEM_SEED = [
  { id: "manicures", label: "Manicures", icon: "hand" as const },
  { id: "sobrancelheiras", label: "Sobrancelheiras", icon: "eye" as const },
  { id: "cabeleireiros", label: "Cabeleireiros(as)", icon: "scissors" as const },
  { id: "barbeiros", label: "Barbeiros", icon: "users" as const },
  { id: "esteticistas", label: "Esteticistas", icon: "sparkles" as const },
  { id: "maquiadoras", label: "Maquiadoras(es)", icon: "palette" as const },
];

export function AudienceSection({ content }: { content?: LandingContent["audience"] }) {
  const title = content?.title || AUDIENCE_DEFAULTS.title;
  const subtitle = content?.subtitle || AUDIENCE_DEFAULTS.subtitle;
  const items =
    content?.items && content.items.length > 0
      ? content.items.map((item) => ({ ...item, icon: resolveIcon(item.icon, Sparkles) }))
      : AUDIENCE_DEFAULTS.items;

  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {items.map((item) => (
            <div
              key={item.id ?? item.label}
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
