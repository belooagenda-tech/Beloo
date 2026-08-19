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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicProfessional } from "./types";

const SEM_PREFERENCIA = "__sem_preferencia__";

export function JoinWaitlistForm({
  slug,
  serviceId,
  professionals = [],
}: {
  slug: string;
  serviceId: string;
  professionals?: PublicProfessional[];
}) {
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState(SEM_PREFERENCIA);
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
      professionalId: professionalId === SEM_PREFERENCIA ? undefined : professionalId,
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
      {professionals.length > 0 ? (
        <div className="space-y-1.5">
          <Label>Profissional (opcional)</Label>
          <Select value={professionalId} onValueChange={(v) => setProfessionalId(v ?? SEM_PREFERENCIA)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === SEM_PREFERENCIA) return "Sem preferência";
                  return professionals.find((p) => p.id === value)?.nome ?? "Sem preferência";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_PREFERENCIA}>Sem preferência</SelectItem>
              {professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  {professional.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Button type="submit" className="w-full" size="sm" disabled={submitting}>
        {submitting ? "Enviando..." : "Entrar na lista de espera"}
      </Button>
    </form>
  );
}
