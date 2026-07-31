import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/entrar">Entrar</Link>} />
          <Button render={<Link href="/criar-agenda">Criar minha agenda</Link>} />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Sua agenda online, do seu jeito.
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Configure sua agenda, compartilhe seu link e comece a receber
          agendamentos hoje mesmo.
        </p>
        <Button
          size="lg"
          className="mt-8"
          render={<Link href="/criar-agenda">Criar minha agenda grátis</Link>}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          A página completa chega em breve.
        </p>
      </main>
    </div>
  );
}
