"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EDITABLE_PAGES } from "@/lib/layout-editor/pages";

export function EditorTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border bg-background px-4 pt-3">
      {EDITABLE_PAGES.map((page) => {
        const href = `/app/editor/${page.key}`;
        const active = pathname === href;
        return (
          <Link
            key={page.key}
            href={href}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
