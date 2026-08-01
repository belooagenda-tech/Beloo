import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/entrar">Entrar</Link>} />
          <Button nativeButton={false} render={<Link href="/criar-agenda">Criar minha agenda</Link>} />
        </nav>
      </div>
    </header>
  );
}
