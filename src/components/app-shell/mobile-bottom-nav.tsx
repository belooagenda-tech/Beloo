"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_MOBILE_NAV_ITEMS, SECONDARY_MOBILE_NAV_ITEMS } from "./nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileBottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  const maisAtivo = SECONDARY_MOBILE_NAV_ITEMS.some((item) => isActive(item.href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {PRIMARY_MOBILE_NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                maisAtivo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="size-5" />
              Mais
            </button>
          }
        />
        <DropdownMenuContent align="end" side="top" className="min-w-44">
          {SECONDARY_MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
