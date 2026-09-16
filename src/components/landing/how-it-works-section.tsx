import { CalendarClock, Link2, Sparkles } from "lucide-react";
import { resolveIcon } from "@/lib/layout-editor/icons";
import type { LandingContent } from "@/lib/layout-editor/landing-schema";

export const HOW_IT_WORKS_DEFAULTS = {
  title: "Como funciona",
  subtitle: "Três passos entre você e uma agenda cheia.",
  items: [
    {
      id: "passo-1",
      numero: "1",
      icon: CalendarClock,
      titulo: "Configure sua agenda",
      descricao:
        "Cadastre seus serviços, defina seus horários de atendimento e pronto — sua agenda já está pronta pra receber clientes.",
    },
    {
      id: "passo-2",
      numero: "2",
      icon: Link2,
      titulo: "Compartilhe seu link",
      descricao:
        "Cada loja ganha um link só dela (beloo.app/sua-loja). Coloca no Instagram, no WhatsApp, onde quiser.",
    },
    {
      id: "passo-3",
      numero: "3",
      icon: Sparkles,
      titulo: "Receba agendamentos",
      descricao:
        "Seus clientes escolhem o serviço e o horário sozinhos. Você recebe a notificação e já vê tudo organizado no seu dia.",
    },
  ],
};

// Mesmos passos de HOW_IT_WORKS_DEFAULTS.items, com a chave de ícone (string)
// pro Editor Visual pré-popular a lista editável (ver landing-editor.tsx).
export const HOW_IT_WORKS_ITEM_SEED = [
  {
    id: "passo-1",
    titulo: "Configure sua agenda",
    descricao:
      "Cadastre seus serviços, defina seus horários de atendimento e pronto — sua agenda já está pronta pra receber clientes.",
    icon: "calendar-clock" as const,
  },
  {
    id: "passo-2",
    titulo: "Compartilhe seu link",
    descricao:
      "Cada loja ganha um link só dela (beloo.app/sua-loja). Coloca no Instagram, no WhatsApp, onde quiser.",
    icon: "link" as const,
  },
  {
    id: "passo-3",
    titulo: "Receba agendamentos",
    descricao:
      "Seus clientes escolhem o serviço e o horário sozinhos. Você recebe a notificação e já vê tudo organizado no seu dia.",
    icon: "sparkles" as const,
  },
];

export function HowItWorksSection({ content }: { content?: LandingContent["howItWorks"] }) {
  const title = content?.title || HOW_IT_WORKS_DEFAULTS.title;
  const subtitle = content?.subtitle || HOW_IT_WORKS_DEFAULTS.subtitle;
  const items =
    content?.items && content.items.length > 0
      ? content.items.map((item, index) => ({
          ...item,
          numero: String(index + 1),
          icon: resolveIcon(item.icon, Sparkles),
        }))
      : HOW_IT_WORKS_DEFAULTS.items;

  return (
    <section id="como-funciona" className="bg-secondary/30 px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
          {items.map((passo) => (
            <div key={passo.id ?? passo.numero} className="relative flex flex-col items-center text-center">
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
