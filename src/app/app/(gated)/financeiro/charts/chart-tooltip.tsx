"use client";

import type { TooltipContentProps } from "recharts";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">
      {label ? <p className="mb-1 font-medium">{String(label)}</p> : null}
      {payload.map((item) => (
        <p key={String(item.name)} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.name}: <span className="font-medium text-foreground">{formatarPreco(Number(item.value))}</span>
        </p>
      ))}
    </div>
  );
}
