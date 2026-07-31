import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="px-6 py-5 sm:px-10">
        <Link href="/" aria-label="Ir para a página inicial da Beloo">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
