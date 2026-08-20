import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export function LegalPage({
  title,
  atualizadoEm,
  children,
}: {
  title: string;
  atualizadoEm: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-5 sm:px-10">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex-1 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Última atualização: {atualizadoEm}
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
