"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EDITABLE_PAGES } from "@/lib/layout-editor/pages";

// Todas as páginas editáveis num único nível de abas, roláveis na
// horizontal — sem agrupar nenhuma delas atrás de um menu.
export function EditorTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 pt-3">
      {EDITABLE_PAGES.map((page) => {
        const href = `/app/editor/${page.key}`;
        const active = pathname === href;
        return (
          <Link
            key={page.key}
            href={href}
            className={cn(
              "shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
