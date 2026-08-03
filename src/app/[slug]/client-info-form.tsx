"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { clientInfoSchema, type ClientInfoInput } from "@/lib/validations/public-booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PublicService } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientInfoForm({
  service,
  inicioISO,
  timezone,
  entradaValor,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  service: PublicService;
  inicioISO: string;
  timezone: string;
  entradaValor?: number;
  onSubmit: (values: ClientInfoInput) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInfoInput>({ resolver: zodResolver(clientInfoSchema) });

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(inicioISO));
  const horaFormatada = formatInTimeZone(new Date(inicioISO), timezone, "HH:mm");

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Trocar horário
      </Button>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground">{service.nome}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {dataFormatada} às {horaFormatada} · {formatarPreco(service.preco)}
          </p>
          {entradaValor ? (
            <p className="mt-2 text-sm font-medium text-primary">
              Entrada de {formatarPreco(entradaValor)} para confirmar · restante{" "}
              {formatarPreco(service.preco - entradaValor)} no dia
            </p>
          ) : null}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="nome-cliente">Seu nome</Label>
          <Input id="nome-cliente" placeholder="Como podemos te chamar" {...register("nome")} />
          {errors.nome ? (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefone-cliente">WhatsApp</Label>
          <Input
            id="telefone-cliente"
            placeholder="(21) 99999-9999"
            autoComplete="tel"
            {...register("telefone")}
          />
          {errors.telefone ? (
            <p className="text-sm text-destructive">{errors.telefone.message}</p>
          ) : null}
        </div>

        {/* Campo-armadilha contra bots: invisível para pessoas via CSS, mas
            presente no DOM. Nunca deve ser preenchido por um usuário real. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="empresa-honeypot">Não preencha este campo</label>
          <input
            id="empresa-honeypot"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("empresa")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? "Aguarde..."
            : entradaValor
              ? "Ir para pagamento"
              : "Confirmar agendamento"}
        </Button>
      </form>
    </div>
  );
}
