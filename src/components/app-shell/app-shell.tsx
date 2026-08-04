import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import type { Notification } from "@/lib/supabase/types";
import { AppSidebarNav } from "./app-sidebar-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "./notification-bell";

export function AppShell({
  nomeLoja,
  notifications,
  isAdmin = false,
  children,
}: {
  nomeLoja: string;
  notifications: Notification[];
  isAdmin?: boolean;
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
        <div className="flex items-center gap-1">
          <NotificationBell initialNotifications={notifications} />
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <AppSidebarNav isAdmin={isAdmin} />
        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav isAdmin={isAdmin} />
    </div>
  );
}
