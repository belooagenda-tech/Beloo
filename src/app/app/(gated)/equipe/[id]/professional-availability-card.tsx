"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import {
  businessHoursParaDias,
  diasParaBusinessHours,
  type DiaDisponibilidade,
} from "@/components/availability/types";
import type { TipoExcecao } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

type HourRow = { dia_semana: number; hora_inicio: string; hora_fim: string };
type ExceptionRow = { id: string; data: string; tipo: TipoExcecao; hora_inicio: string | null; hora_fim: string | null };

function formatarDataBR(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ProfessionalAvailabilityCard({
  professionalId,
  initialUsaHorarioProprio,
  initialHours,
  fallbackHours,
  initialExceptions,
}: {
  professionalId: string;
  initialUsaHorarioProprio: boolean;
  initialHours: HourRow[];
  // Horário da loja — usado só pra pré-preencher a primeira vez que o
  // profissional liga "horário próprio" sem nada salvo ainda, como ponto de
  // partida em vez de uma semana em branco.
  fallbackHours: HourRow[];
  initialExceptions: ExceptionRow[];
}) {
  const [usaHorarioProprio, setUsaHorarioProprio] = useState(initialUsaHorarioProprio);
  const [savingToggle, setSavingToggle] = useState(false);
  const [dias, setDias] = useState<DiaDisponibilidade[]>(
    businessHoursParaDias(initialHours.length > 0 ? initialHours : fallbackHours),
  );
  const [savingHours, setSavingHours] = useState(false);

  const [exceptions, setExceptions] = useState<ExceptionRow[]>(initialExceptions);
  const [open, setOpen] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<TipoExcecao>("folga");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");

  async function handleToggle(checked: boolean) {
    setSavingToggle(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("professionals")
      .update({ usa_horario_proprio: checked })
      .eq("id", professionalId);
    setSavingToggle(false);

    if (error) {
      toast.error("Não foi possível atualizar. Tente novamente.");
      return;
    }
    setUsaHorarioProprio(checked);
  }

  async function handleSaveHours() {
    setSavingHours(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("replace_professional_hours", {
      p_professional_id: professionalId,
      p_hours: diasParaBusinessHours(dias),
    });
    setSavingHours(false);

    if (error) {
      toast.error("Não foi possível salvar os horários. Tente novamente.");
      return;
    }
    toast.success("Horários atualizados.");
  }

  function resetExceptionForm() {
    setData("");
    setTipo("folga");
    setHoraInicio("09:00");
    setHoraFim("18:00");
    setExceptionError(null);
  }

  async function handleAddException() {
    if (!data) {
      setExceptionError("Escolha uma data.");
      return;
    }
    setSavingException(true);
    setExceptionError(null);

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("professional_exceptions")
      .insert({
        professional_id: professionalId,
        data,
        tipo,
        hora_inicio: tipo === "horario_especial" ? horaInicio : null,
        hora_fim: tipo === "horario_especial" ? horaFim : null,
      })
      .select("id, data, tipo, hora_inicio, hora_fim")
      .single();

    setSavingException(false);

    if (insertError || !inserted) {
      setExceptionError(
        insertError?.code === "23505"
          ? "Já existe uma exceção cadastrada para essa data."
          : "Não foi possível salvar. Tente novamente.",
      );
      return;
    }

    setExceptions((prev) => [...prev, inserted].sort((a, b) => a.data.localeCompare(b.data)));
    setOpen(false);
    resetExceptionForm();
    toast.success("Exceção adicionada.");
  }

  async function handleDeleteException(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("professional_exceptions").delete().eq("id", id);
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
      <CardHeader>
        <CardTitle className="text-base">Disponibilidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Usar horário próprio</p>
            <p className="text-sm text-muted-foreground">
              {usaHorarioProprio
                ? "Esse profissional tem dias, horários e folgas independentes da loja."
                : "Segue a disponibilidade principal da loja, sem variações."}
            </p>
          </div>
          <Switch checked={usaHorarioProprio} disabled={savingToggle} onCheckedChange={handleToggle} />
        </div>

        {usaHorarioProprio ? (
          <>
            <div className="space-y-2">
              <Label>Horários da semana</Label>
              <AvailabilityEditor value={dias} onChange={setDias} />
              <Button size="sm" onClick={handleSaveHours} disabled={savingHours}>
                {savingHours ? "Salvando..." : "Salvar horários"}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Folgas e horários especiais</Label>
                <Dialog
                  open={open}
                  onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) resetExceptionForm();
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
                      {exceptionError ? <p className="text-sm text-destructive">{exceptionError}</p> : null}
                      <div className="space-y-1.5">
                        <Label htmlFor="data-excecao-profissional">Data</Label>
                        <Input
                          id="data-excecao-profissional"
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
                          <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                          <span className="text-sm text-muted-foreground">até</span>
                          <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                        </div>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddException} disabled={savingException} className="w-full">
                        {savingException ? "Salvando..." : "Adicionar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma folga cadastrada ainda.</p>
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
                        onClick={() => handleDeleteException(exception.id)}
                        aria-label="Remover exceção"
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
