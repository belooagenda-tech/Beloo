"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MonthlyRevenueCard({
  businessId,
  totalMesAtual,
  totalMesAnterior,
  metaInicial,
}: {
  businessId: string;
  totalMesAtual: number;
  totalMesAnterior: number;
  metaInicial: number | null;
}) {
  const [meta, setMeta] = useState(metaInicial);
  const [editando, setEditando] = useState(false);
  const [valorInput, setValorInput] = useState(metaInicial ? String(metaInicial) : "");
  const [salvando, setSalvando] = useState(false);

  const progresso = meta && meta > 0 ? Math.min(100, Math.round((totalMesAtual / meta) * 100)) : null;
  const deltaPercentual =
    totalMesAnterior > 0 ? Math.round(((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100) : null;

  async function salvarMeta() {
    const bruto = valorInput.trim().replace(",", ".");
    const novoValor = bruto === "" ? null : Number(bruto);
    if (novoValor !== null && (Number.isNaN(novoValor) || novoValor < 0)) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ meta_faturamento_mensal: novoValor })
      .eq("id", businessId);
    setSalvando(false);

    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    setMeta(novoValor);
    setEditando(false);
    toast.success("Meta atualizada.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Faturamento deste mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold text-foreground">{formatarPreco(totalMesAtual)}</p>
          {deltaPercentual !== null ? (
            <span
              className={cn(
                "text-sm font-medium",
                deltaPercentual >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {deltaPercentual >= 0 ? "+" : ""}
              {deltaPercentual}% vs mês passado
            </span>
          ) : null}
        </div>

        {meta && progresso !== null ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {progresso}% da meta de {formatarPreco(meta)}
            </p>
          </div>
        ) : null}

        {editando ? (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              className="max-w-32"
            />
            <Button size="sm" disabled={salvando} onClick={salvarMeta}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" disabled={salvando} onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="print:hidden" onClick={() => setEditando(true)}>
            {meta ? "Editar meta mensal" : "Definir meta mensal"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
