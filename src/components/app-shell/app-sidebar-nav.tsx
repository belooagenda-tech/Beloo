"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3"
    >
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
