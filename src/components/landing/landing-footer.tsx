import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function LandingFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="max-w-xs text-center text-sm text-muted-foreground sm:text-left">
            O jeito simples de organizar a agenda de quem trabalha com beleza.
          </p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/entrar" className="hover:text-foreground">
            Entrar
          </Link>
          <Link href="/criar-agenda" className="hover:text-foreground">
            Criar minha agenda
          </Link>
        </nav>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © {ano} Beloo. Feito com carinho para quem cuida da beleza dos outros.
      </p>
    </footer>
  );
}
