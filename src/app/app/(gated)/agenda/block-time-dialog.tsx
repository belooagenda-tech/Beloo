"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fromZonedTime } from "date-fns-tz";
import { CalendarOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { agendaBlockSchema, type AgendaBlockInput } from "@/lib/validations/agenda-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AgendaBlock } from "./types";

function BlockTimeForm({
  businessId,
  timezone,
  dataSelecionada,
  onOpenChange,
  onCreated,
}: {
  businessId: string;
  timezone: string;
  dataSelecionada: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (block: AgendaBlock) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgendaBlockInput>({
    resolver: zodResolver(agendaBlockSchema),
    defaultValues: { data: dataSelecionada, horaInicio: "12:00", horaFim: "13:00", motivo: "" },
  });

  async function onSubmit(values: AgendaBlockInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const inicio = fromZonedTime(`${values.data}T${values.horaInicio}:00`, timezone);
    const fim = fromZonedTime(`${values.data}T${values.horaFim}:00`, timezone);

    const { data: block, error: insertError } = await supabase
      .from("agenda_blocks")
      .insert({
        business_id: businessId,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        motivo: values.motivo?.trim() || null,
      })
      .select("id, inicio, fim, motivo")
      .single();
    setSubmitting(false);

    if (insertError || !block) {
      setError("Não foi possível bloquear esse horário. Tente novamente.");
      return;
    }

    onCreated(block);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="data-bloqueio">Data</Label>
        <Input id="data-bloqueio" type="date" {...register("data")} />
        {errors.data ? <p className="text-sm text-destructive">{errors.data.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inicio-bloqueio">Início</Label>
          <Input id="inicio-bloqueio" type="time" {...register("horaInicio")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fim-bloqueio">Término</Label>
          <Input id="fim-bloqueio" type="time" {...register("horaFim")} />
        </div>
      </div>
      {errors.horaFim ? <p className="text-sm text-destructive">{errors.horaFim.message}</p> : null}

      <div className="space-y-1.5">
        <Label htmlFor="motivo-bloqueio">Motivo (opcional)</Label>
        <Input
          id="motivo-bloqueio"
          placeholder="Ex.: almoço, compromisso pessoal"
          {...register("motivo")}
        />
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Bloqueando..." : "Bloquear horário"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BlockTimeDialog({
  businessId,
  timezone,
  dataSelecionada,
  onCreated,
}: {
  businessId: string;
  timezone: string;
  dataSelecionada: string;
  onCreated: (block: AgendaBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <CalendarOff className="size-4" />
            Bloquear horário
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>
        {open ? (
          <BlockTimeForm
            key={formKey}
            businessId={businessId}
            timezone={timezone}
            dataSelecionada={dataSelecionada}
            onOpenChange={setOpen}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
