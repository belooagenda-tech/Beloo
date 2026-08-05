"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneBR, normalizePhone } from "@/lib/phone";
import { manualAppointmentSchema, type ManualAppointmentInput } from "@/lib/validations/appointment";
import { ClientPicker } from "@/components/client-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { AgendaAppointment, AgendaClient, AgendaService } from "./types";

function NewAppointmentForm({
  businessId,
  timezone,
  services,
  dataSelecionada,
  onOpenChange,
  onCreated,
}: {
  businessId: string;
  timezone: string;
  services: AgendaService[];
  dataSelecionada: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (appointment: AgendaAppointment, client: AgendaClient) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ManualAppointmentInput>({
    resolver: zodResolver(manualAppointmentSchema),
    defaultValues: { data: dataSelecionada, hora: "09:00", serviceId: services[0]?.id ?? "" },
  });

  function handlePickClient(client: AgendaClient) {
    setValue("nome", client.nome, { shouldValidate: true });
    setValue("telefone", formatPhoneBR(client.telefone), { shouldValidate: true });
  }

  async function onSubmit(values: ManualAppointmentInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const service = services.find((s) => s.id === values.serviceId);
    if (!service) {
      setSubmitting(false);
      setError("Escolha um serviço válido.");
      return;
    }

    const telefoneNormalizado = normalizePhone(values.telefone);

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, nome, telefone")
      .eq("business_id", businessId)
      .eq("telefone", telefoneNormalizado)
      .maybeSingle();

    let client: AgendaClient | null = existingClient;

    if (!client) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ business_id: businessId, nome: values.nome, telefone: telefoneNormalizado })
        .select("id, nome, telefone")
        .single();
      if (clientError || !newClient) {
        setSubmitting(false);
        setError("Não foi possível salvar o cliente. Tente novamente.");
        return;
      }
      client = newClient;
    }

    const inicio = fromZonedTime(`${values.data}T${values.hora}:00`, timezone);
    const fim = addMinutes(inicio, service.duracao_min);

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        client_id: client.id,
        service_id: service.id,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        status: "agendado",
      })
      .select("id, client_id, service_id, inicio, fim, status, observacoes, entrada_status, entrada_valor")
      .single();
    setSubmitting(false);

    if (appointmentError || !appointment) {
      setError(
        appointmentError?.code === "23P01"
          ? "Já existe um agendamento nesse horário."
          : "Não foi possível criar o agendamento. Tente novamente.",
      );
      return;
    }

    onCreated(appointment, client);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ClientPicker businessId={businessId} onSelect={handlePickClient} />

      <div className="space-y-1.5">
        <Label htmlFor="nome-manual">Nome do cliente</Label>
        <Input id="nome-manual" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone-manual">WhatsApp</Label>
        <Input id="telefone-manual" placeholder="(21) 99999-9999" {...register("telefone")} />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Serviço</Label>
        <Controller
          name="serviceId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) => {
                    const service = services.find((s) => s.id === value);
                    return service ? `${service.nome} · ${service.duracao_min} min` : "Escolha o serviço";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.nome} · {service.duracao_min} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.serviceId ? (
          <p className="text-sm text-destructive">{errors.serviceId.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="data-manual">Data</Label>
          <Input id="data-manual" type="date" {...register("data")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hora-manual">Horário</Label>
          <Input id="hora-manual" type="time" {...register("hora")} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Criando..." : "Criar agendamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function NewAppointmentDialog({
  businessId,
  timezone,
  services,
  dataSelecionada,
  onCreated,
}: {
  businessId: string;
  timezone: string;
  services: AgendaService[];
  dataSelecionada: string;
  onCreated: (appointment: AgendaAppointment, client: AgendaClient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const servicosAtivos = services.filter((s) => s.ativo);

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
          <Button size="sm">
            <Plus className="size-4" />
            Novo agendamento
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        {servicosAtivos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre pelo menos um serviço ativo antes de criar agendamentos.
          </p>
        ) : open ? (
          <NewAppointmentForm
            key={formKey}
            businessId={businessId}
            timezone={timezone}
            services={servicosAtivos}
            dataSelecionada={dataSelecionada}
            onOpenChange={setOpen}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
