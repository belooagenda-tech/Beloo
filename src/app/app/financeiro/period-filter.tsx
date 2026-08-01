"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "mes-atual", label: "Este mês" },
] as const;

export function PeriodFilter({ periodo }: { periodo: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar período">
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          size="sm"
          variant={preset.value === periodo ? "default" : "outline"}
          className={cn(preset.value !== periodo && "text-muted-foreground")}
          onClick={() => router.push(`/app/financeiro?periodo=${preset.value}`)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
