"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessException, TipoExcecao } from "@/lib/supabase/types";
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

type ExceptionRow = Pick<BusinessException, "id" | "data" | "tipo" | "hora_inicio" | "hora_fim">;

function formatarDataBR(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ExceptionsCard({
  businessId,
  initialExceptions,
}: {
  businessId: string;
  initialExceptions: ExceptionRow[];
}) {
  const [exceptions, setExceptions] = useState<ExceptionRow[]>(initialExceptions);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<TipoExcecao>("folga");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");

  function resetForm() {
    setData("");
    setTipo("folga");
    setHoraInicio("09:00");
    setHoraFim("18:00");
    setError(null);
  }

  async function handleAdd() {
    if (!data) {
      setError("Escolha uma data.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("business_exceptions")
      .insert({
        business_id: businessId,
        data,
        tipo,
        hora_inicio: tipo === "horario_especial" ? horaInicio : null,
        hora_fim: tipo === "horario_especial" ? horaFim : null,
      })
      .select("id, data, tipo, hora_inicio, hora_fim")
      .single();

    setSaving(false);

    if (insertError || !inserted) {
      setError(
        insertError?.code === "23505"
          ? "Já existe uma exceção cadastrada para essa data."
          : "Não foi possível salvar. Tente novamente.",
      );
      return;
    }

    setExceptions((prev) =>
      [...prev, inserted].sort((a, b) => a.data.localeCompare(b.data)),
    );
    setOpen(false);
    resetForm();
    toast.success("Exceção adicionada.");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("business_exceptions")
      .delete()
      .eq("id", id);
    setDeletingId(null);

    if (deleteError) {
      toast.error("Não foi possível remover. Tente novamente.");
      return;
    }
    setExceptions((prev) => prev.filter((exception) => exception.id !== id));
    toast.success("Exceção removida.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Folgas e horários especiais</CardTitle>
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
              <DialogTitle>Nova exceção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="space-y-1.5">
                <Label htmlFor="data-excecao">Data</Label>
                <Input
                  id="data-excecao"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoExcecao)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string | null) =>
                        value === "horario_especial" ? "Horário especial" : "Folga (dia inteiro)"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folga">Folga (dia inteiro)</SelectItem>
                    <SelectItem value="horario_especial">Horário especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tipo === "horario_especial" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                  />
                </div>
              ) : null}
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
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma folga ou horário especial cadastrado ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((exception) => (
              <li
                key={exception.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatarDataBR(exception.data)}
                  </span>
                  {exception.tipo === "folga" ? (
                    <Badge variant="secondary">Folga</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {exception.hora_inicio?.slice(0, 5)}–{exception.hora_fim?.slice(0, 5)}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === exception.id}
                  onClick={() => handleDelete(exception.id)}
                  aria-label="Remover exceção"
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
