import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "./hero-mockup";
import type { LandingContent } from "@/lib/layout-editor/landing-schema";

// Conteúdo hardcoded original — também serve de fallback/placeholder para o
// Editor Visual quando não há override publicado (ver src/app/page.tsx e
// src/app/app/editor/[pageKey]/landing-editor.tsx).
export const HERO_DEFAULTS = {
  badge: "Feito para quem trabalha com beleza",
  headline: "Sua agenda online, do seu jeito.",
  subtitle:
    "Configure sua agenda, compartilhe seu link e comece a receber agendamentos hoje mesmo — sem planilha, sem grupo de WhatsApp lotado.",
  cta1Label: "Criar minha agenda grátis",
  cta2Label: "Ver como funciona",
};

export function HeroSection({ content }: { content?: LandingContent["hero"] }) {
  const badge = content?.badge || HERO_DEFAULTS.badge;
  const headline = content?.headline || HERO_DEFAULTS.headline;
  const subtitle = content?.subtitle || HERO_DEFAULTS.subtitle;
  const cta1Label = content?.cta1Label || HERO_DEFAULTS.cta1Label;
  const cta2Label = content?.cta2Label || HERO_DEFAULTS.cta2Label;

  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:px-10 sm:pt-24 sm:pb-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-linear-to-b from-secondary/70 via-background to-background"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {badge}
          </span>
          <h1 className="mt-5 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground lg:mx-0">{subtitle}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/criar-agenda">{cta1Label}</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="#como-funciona">{cta2Label}</Link>}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Grátis para começar. Leva menos de 2 minutos.
          </p>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}
