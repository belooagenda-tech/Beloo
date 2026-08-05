import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getSessionDivulgador } from "@/lib/divulgador/auth";
import { LogoutButton } from "./logout-button";

export default async function DivulgadorDashboardLayout({ children }: { children: ReactNode }) {
  const divulgador = await getSessionDivulgador();
  if (!divulgador) {
    redirect("/divulgador/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <Link href="/divulgador/dashboard" aria-label="Painel do divulgador">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{divulgador.nome}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
