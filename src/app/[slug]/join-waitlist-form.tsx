"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { clientInfoSchema, type ClientInfoInput } from "@/lib/validations/public-booking";
import { joinWaitlistAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function JoinWaitlistForm({ slug, serviceId }: { slug: string; serviceId: string }) {
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInfoInput>({ resolver: zodResolver(clientInfoSchema) });

  async function onSubmit(values: ClientInfoInput) {
    setSubmitting(true);
    setError(null);
    const resultado = await joinWaitlistAction({
      slug,
      nome: values.nome,
      telefone: values.telefone,
      serviceId,
    });
    setSubmitting(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed border-success/40 bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <p>Prontinho! Você entrou na lista de espera — te chamamos no WhatsApp assim que abrir um horário.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-md border border-dashed border-border p-3"
      noValidate
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <p className="text-sm font-medium text-foreground">Entrar na lista de espera</p>
        <p className="text-xs text-muted-foreground">
          A gente te chama no WhatsApp se abrir um horário.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="waitlist-nome">Nome</Label>
        <Input id="waitlist-nome" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="waitlist-telefone">WhatsApp</Label>
        <Input id="waitlist-telefone" placeholder="(21) 99999-9999" {...register("telefone")} />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" size="sm" disabled={submitting}>
        {submitting ? "Enviando..." : "Entrar na lista de espera"}
      </Button>
    </form>
  );
}
