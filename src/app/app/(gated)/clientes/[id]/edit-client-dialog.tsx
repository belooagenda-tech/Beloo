"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { clientSchema, type ClientFormInput } from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ClientDetail } from "./types";

function EditClientForm({
  client,
  onOpenChange,
  onSaved,
}: {
  client: ClientDetail;
  onOpenChange: (open: boolean) => void;
  onSaved: (client: ClientDetail) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: client.nome,
      telefone: client.telefone,
      observacoes: client.observacoes ?? "",
      dataNascimento: client.data_nascimento ?? "",
    },
  });

  async function onSubmit(values: ClientFormInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("clients")
      .update({
        nome: values.nome,
        telefone: normalizePhone(values.telefone),
        observacoes: values.observacoes || null,
        data_nascimento: values.dataNascimento || null,
      })
      .eq("id", client.id)
      .select("id, nome, telefone, observacoes, data_nascimento, criado_em")
      .single();
    setSubmitting(false);

    if (updateError || !data) {
      setError(
        updateError?.code === "23505"
          ? "Já existe um cliente com esse telefone."
          : "Não foi possível salvar. Tente novamente.",
      );
      return;
    }

    onSaved(data);
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
        <Label htmlFor="nome-editar-cliente">Nome</Label>
        <Input id="nome-editar-cliente" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone-editar-cliente">WhatsApp</Label>
        <Input id="telefone-editar-cliente" {...register("telefone")} />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nascimento-editar-cliente">Data de nascimento (opcional)</Label>
        <Input id="nascimento-editar-cliente" type="date" {...register("dataNascimento")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="obs-editar-cliente">Observações</Label>
        <Textarea id="obs-editar-cliente" rows={4} {...register("observacoes")} />
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditClientDialog({
  client,
  onSaved,
}: {
  client: ClientDetail;
  onSaved: (client: ClientDetail) => void;
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
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        {open ? (
          <EditClientForm key={formKey} client={client} onOpenChange={setOpen} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
