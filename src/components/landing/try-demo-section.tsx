import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/lib/layout-editor/landing-schema";

export const TRY_DEMO_DEFAULTS = {
  headline: "Veja como seus clientes vão agendar",
  subtitle:
    "Antes de criar sua conta, teste o agendamento público de ponta a ponta — com serviços, produtos e plano de exemplo. É a mesma experiência que sua cliente vai ter, só que com dados fictícios.",
  buttonLabel: "Testar agendamento de exemplo",
};

export function TryDemoSection({ content }: { content?: LandingContent["tryDemo"] }) {
  const headline = content?.headline || TRY_DEMO_DEFAULTS.headline;
  const subtitle = content?.subtitle || TRY_DEMO_DEFAULTS.subtitle;
  const buttonLabel = content?.buttonLabel || TRY_DEMO_DEFAULTS.buttonLabel;

  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-secondary/40 px-6 py-12 text-center sm:px-12">
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
          <PlayCircle className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {headline}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        <Button
          size="lg"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/demo">{buttonLabel}</Link>}
        />
      </div>
    </section>
  );
}
