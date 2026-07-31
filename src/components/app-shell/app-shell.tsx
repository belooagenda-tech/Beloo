import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { AppSidebarNav } from "./app-sidebar-nav";
import { SignOutButton } from "./sign-out-button";

export function AppShell({
  nomeLoja,
  children,
}: {
  nomeLoja: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link href="/app" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-heading text-sm font-semibold text-foreground sm:text-base">
            {nomeLoja}
          </span>
        </Link>
        <SignOutButton />
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <AppSidebarNav />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
