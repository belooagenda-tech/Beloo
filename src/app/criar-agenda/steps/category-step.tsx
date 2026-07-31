"use client";

import { useState } from "react";
import { CATEGORIAS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CategoryStep({
  defaultValue,
  onSubmit,
  onBack,
  submitting,
}: {
  defaultValue?: string;
  onSubmit: (categoria: string) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [categoria, setCategoria] = useState<string | undefined>(defaultValue);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIAS.map((opcao) => (
          <button
            key={opcao.value}
            type="button"
            onClick={() => setCategoria(opcao.value)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm font-medium transition-colors",
              categoria === opcao.value
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            {opcao.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={!categoria || submitting}
          onClick={() => categoria && onSubmit(categoria)}
        >
          {submitting ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
