"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIAS_SEMANA } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RecurringBlock } from "@/lib/supabase/types";

type RecurringBlockRow = Pick<RecurringBlock, "id" | "dia_semana" | "hora_inicio" | "hora_fim" | "motivo">;

export function RecurringBlocksCard({
  businessId,
  initialBlocks,
}: {
  businessId: string;
  initialBlocks: RecurringBlockRow[];
}) {
  const [blocks, setBlocks] = useState<RecurringBlockRow[]>(initialBlocks);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [horaFim, setHoraFim] = useState("13:00");
  const [motivo, setMotivo] = useState("");

  function resetForm() {
    setDiaSemana(1);
    setHoraInicio("12:00");
    setHoraFim("13:00");
    setMotivo("");
    setError(null);
  }

  async function handleAdd() {
    if (horaFim <= horaInicio) {
      setError("O horário de término precisa ser depois do início.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("recurring_blocks")
      .insert({
        business_id: businessId,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo: motivo.trim() || null,
      })
      .select("id, dia_semana, hora_inicio, hora_fim, motivo")
      .single();

    setSaving(false);

    if (insertError || !inserted) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }

    setBlocks((prev) =>
      [...prev, inserted].sort(
        (a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio),
      ),
    );
    setOpen(false);
    resetForm();
    toast.success("Bloqueio recorrente adicionado.");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("recurring_blocks").delete().eq("id", id);
    setDeletingId(null);

    if (deleteError) {
      toast.error("Não foi possível remover. Tente novamente.");
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    toast.success("Bloqueio removido.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Bloqueios recorrentes</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Um horário que fica indisponível toda semana, no mesmo dia (ex.: almoço).
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Adicionar
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo bloqueio recorrente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="space-y-1.5">
                <Label>Dia da semana</Label>
                <Select
                  value={String(diaSemana)}
                  onValueChange={(v) => v && setDiaSemana(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        DIAS_SEMANA.find((d) => String(d.value) === value)?.label ?? "Escolha..."
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia.value} value={String(dia.value)}>
                        {dia.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                <span className="text-sm text-muted-foreground">até</span>
                <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivo-recorrente">Motivo (opcional)</Label>
                <Input
                  id="motivo-recorrente"
                  placeholder="Ex.: almoço"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum bloqueio recorrente cadastrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {DIAS_SEMANA.find((d) => d.value === block.dia_semana)?.label}
                  </span>
                  <Badge variant="secondary">
                    {block.hora_inicio.slice(0, 5)}–{block.hora_fim.slice(0, 5)}
                  </Badge>
                  {block.motivo ? (
                    <span className="text-xs text-muted-foreground">{block.motivo}</span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === block.id}
                  onClick={() => handleDelete(block.id)}
                  aria-label="Remover bloqueio recorrente"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
