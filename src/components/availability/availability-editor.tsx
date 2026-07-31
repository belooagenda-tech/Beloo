"use client";

import { Plus, Trash2 } from "lucide-react";
import { DIAS_SEMANA } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ORDEM_EXIBICAO_DIAS, type DiaDisponibilidade } from "./types";

export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: DiaDisponibilidade[];
  onChange: (value: DiaDisponibilidade[]) => void;
}) {
  function updateDia(diaSemana: number, updater: (dia: DiaDisponibilidade) => DiaDisponibilidade) {
    onChange(value.map((dia) => (dia.diaSemana === diaSemana ? updater(dia) : dia)));
  }

  function toggleDia(diaSemana: number, ativo: boolean) {
    updateDia(diaSemana, (dia) => ({
      ...dia,
      ativo,
      blocos: ativo && dia.blocos.length === 0 ? [{ inicio: "09:00", fim: "18:00" }] : dia.blocos,
    }));
  }

  function addBloco(diaSemana: number) {
    updateDia(diaSemana, (dia) => ({
      ...dia,
      blocos: [...dia.blocos, { inicio: "09:00", fim: "18:00" }],
    }));
  }

  function removeBloco(diaSemana: number, index: number) {
    updateDia(diaSemana, (dia) => ({
      ...dia,
      blocos: dia.blocos.filter((_, i) => i !== index),
    }));
  }

  function updateBloco(
    diaSemana: number,
    index: number,
    campo: "inicio" | "fim",
    novoValor: string,
  ) {
    updateDia(diaSemana, (dia) => ({
      ...dia,
      blocos: dia.blocos.map((bloco, i) =>
        i === index ? { ...bloco, [campo]: novoValor } : bloco,
      ),
    }));
  }

  const porDia = new Map(value.map((dia) => [dia.diaSemana, dia]));

  return (
    <div className="space-y-2">
      {ORDEM_EXIBICAO_DIAS.map((diaSemana) => {
        const dia = porDia.get(diaSemana);
        const label = DIAS_SEMANA.find((d) => d.value === diaSemana)?.label ?? "";
        if (!dia) return null;

        return (
          <div
            key={diaSemana}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              dia.ativo ? "border-border bg-card" : "border-border/60 bg-muted/30",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={dia.ativo}
                  onCheckedChange={(checked) => toggleDia(diaSemana, checked)}
                  aria-label={`Atender ${label.toLowerCase()}`}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    dia.ativo ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {dia.ativo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addBloco(diaSemana)}
                  className="text-primary hover:text-primary"
                >
                  <Plus className="size-4" />
                  Bloco
                </Button>
              ) : null}
            </div>

            {dia.ativo && dia.blocos.length > 0 ? (
              <div className="mt-3 space-y-2 ps-11">
                {dia.blocos.map((bloco, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={bloco.inicio}
                      onChange={(e) => updateBloco(diaSemana, index, "inicio", e.target.value)}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={bloco.fim}
                      onChange={(e) => updateBloco(diaSemana, index, "fim", e.target.value)}
                      className="w-28"
                    />
                    {dia.blocos.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBloco(diaSemana, index)}
                        aria-label="Remover bloco"
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
