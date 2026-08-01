"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import type { ClientListItem } from "./types";

function NewClientForm({
  businessId,
  onOpenChange,
  onCreated,
}: {
  businessId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ClientListItem) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormInput>({ resolver: zodResolver(clientSchema) });

  async function onSubmit(values: ClientFormInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
        business_id: businessId,
        nome: values.nome,
        telefone: normalizePhone(values.telefone),
        observacoes: values.observacoes || null,
      })
      .select("id, nome, telefone, criado_em")
      .single();
    setSubmitting(false);

    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "Já existe um cliente com esse telefone."
          : "Não foi possível salvar o cliente. Tente novamente.",
      );
      return;
    }

    onCreated(data);
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
        <Label htmlFor="nome-novo-cliente">Nome</Label>
        <Input id="nome-novo-cliente" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefone-novo-cliente">WhatsApp</Label>
        <Input
          id="telefone-novo-cliente"
          placeholder="(21) 99999-9999"
          {...register("telefone")}
        />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="obs-novo-cliente">Observações (opcional)</Label>
        <Textarea id="obs-novo-cliente" rows={3} {...register("observacoes")} />
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function NewClientDialog({
  businessId,
  onCreated,
}: {
  businessId: string;
  onCreated: (client: ClientListItem) => void;
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
          <Button size="sm">
            <Plus className="size-4" />
            Novo cliente
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        {open ? (
          <NewClientForm key={formKey} businessId={businessId} onOpenChange={setOpen} onCreated={onCreated} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
