import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "./hero-mockup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:px-10 sm:pt-24 sm:pb-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-linear-to-b from-secondary/70 via-background to-background"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Feito para quem trabalha com beleza
          </span>
          <h1 className="mt-5 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            Sua agenda online, do seu jeito.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground lg:mx-0">
            Configure sua agenda, compartilhe seu link e comece a receber
            agendamentos hoje mesmo — sem planilha, sem grupo de WhatsApp
            lotado.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/criar-agenda">Criar minha agenda grátis</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="#como-funciona">Ver como funciona</Link>}
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
