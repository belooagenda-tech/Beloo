import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LandingContent } from "@/lib/layout-editor/landing-schema";

export const CTA_DEFAULTS = {
  headline: "Pronta para organizar sua agenda?",
  subtitle: "Crie sua agenda gratuitamente e comece a receber agendamentos ainda hoje.",
  buttonLabel: "Criar minha agenda grátis",
};

export function CtaSection({ content }: { content?: LandingContent["cta"] }) {
  const headline = content?.headline || CTA_DEFAULTS.headline;
  const subtitle = content?.subtitle || CTA_DEFAULTS.subtitle;
  const buttonLabel = content?.buttonLabel || CTA_DEFAULTS.buttonLabel;

  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary-strong px-8 py-14 text-center shadow-xl shadow-primary/20 sm:px-16 sm:py-16">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
          {headline}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">{subtitle}</p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8"
          nativeButton={false}
          render={<Link href="/criar-agenda">{buttonLabel}</Link>}
        />
      </div>
    </section>
  );
}
