"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EDITABLE_PAGES } from "@/lib/layout-editor/pages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PINNED_PAGES = EDITABLE_PAGES.filter((p) => p.type !== "blocks");
const APP_PAGES = EDITABLE_PAGES.filter((p) => p.type === "blocks");

export function EditorTabs() {
  const pathname = usePathname();
  const activeAppPage = APP_PAGES.find((p) => pathname === `/app/editor/${p.key}`);

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border bg-background px-4 pt-3">
      {PINNED_PAGES.map((page) => {
        const href = `/app/editor/${page.key}`;
        const active = pathname === href;
        return (
          <TabLink key={page.key} href={href} active={active} label={page.label} />
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeAppPage
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {activeAppPage ? activeAppPage.label : "Páginas do app"}
              <ChevronDown className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          {APP_PAGES.map((page) => (
            <DropdownMenuItem key={page.key} render={<Link href={`/app/editor/${page.key}`} />}>
              {page.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
