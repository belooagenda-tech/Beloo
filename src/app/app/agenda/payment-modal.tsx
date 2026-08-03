"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkPlanCoverage, type PlanCoverage } from "@/lib/booking/plan-coverage";
import { avulsoPaymentSchema, type AvulsoPaymentInput } from "@/lib/validations/payment";
import type { FormaPagamento } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import type { AgendaAppointment, AgendaClient, AgendaPayment, AgendaService } from "./types";

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mensagemErroRpc(message: string) {
  if (message.includes("no_active_plan") || message.includes("plan_does_not_cover_service")) {
    return "O cliente não tem mais um plano ativo que cubra esse serviço. Registrando como avulso.";
  }
  if (message.includes("no_credits_left")) {
    return "Os créditos desse serviço no plano já acabaram neste ciclo. Registrando como avulso.";
  }
  return "Não foi possível concluir o atendimento. Tente novamente.";
}

function PaymentForm({
  appointment,
  service,
  client,
  existingPayment,
  onOpenChange,
  onCompleted,
}: {
  appointment: AgendaAppointment;
  service: AgendaService;
  client: AgendaClient;
  existingPayment: AgendaPayment | undefined;
  onOpenChange: (open: boolean) => void;
  onCompleted: (payment: AgendaPayment) => void;
}) {
  const jaConcluido = appointment.status === "concluido";
  const [coverage, setCoverage] = useState<PlanCoverage | null>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(!jaConcluido && !existingPayment);
  const [forcarAvulso, setForcarAvulso] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AvulsoPaymentInput>({
    resolver: zodResolver(avulsoPaymentSchema),
    defaultValues: {
      valor: existingPayment?.valor ?? service.preco,
      formaPagamento:
        existingPayment && existingPayment.origem === "avulso"
          ? (existingPayment.forma_pagamento as AvulsoPaymentInput["formaPagamento"])
          : undefined,
    },
  });

  useEffect(() => {
    if (jaConcluido || existingPayment) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const result = await checkPlanCoverage(supabase, client.id, service.id);
      if (active) {
        setCoverage(result);
        setCheckingCoverage(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usaPlano = !jaConcluido && !forcarAvulso && coverage?.covered === true;

  async function completarComPlano() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_appointment_payment", {
      p_appointment_id: appointment.id,
      p_valor: service.preco,
      p_forma_pagamento: "plano",
      p_origem: "plano",
    });
    setSubmitting(false);

    if (rpcError) {
      setError(mensagemErroRpc(rpcError.message));
      setForcarAvulso(true);
      return;
    }

    onCompleted({
      id: existingPayment?.id ?? "",
      appointment_id: appointment.id,
      valor: service.preco,
      forma_pagamento: "plano",
      origem: "plano",
    });
    onOpenChange(false);
  }

  async function onSubmitAvulso(values: AvulsoPaymentInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_appointment_payment", {
      p_appointment_id: appointment.id,
      p_valor: values.valor,
      p_forma_pagamento: values.formaPagamento,
      p_origem: "avulso",
    });
    setSubmitting(false);

    if (rpcError) {
      setError(mensagemErroRpc(rpcError.message));
      return;
    }

    onCompleted({
      id: existingPayment?.id ?? "",
      appointment_id: appointment.id,
      valor: values.valor,
      forma_pagamento: values.formaPagamento,
      origem: "avulso",
    });
    onOpenChange(false);
  }

  if (jaConcluido && existingPayment?.origem === "plano") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Este atendimento foi registrado como <strong>incluso no plano</strong>. O
          valor de referência foi {formatarPreco(existingPayment.valor)}.
        </p>
        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (checkingCoverage) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verificando plano do cliente...
      </div>
    );
  }

  if (usaPlano) {
    return (
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex items-center gap-2">
          <Badge className="bg-success/15 text-success" variant="secondary">
            Incluso no plano
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Valor de referência: {formatarPreco(service.preco)}. Não entra no
          faturamento avulso, mas é contado para o retorno do plano.
        </p>
        <DialogFooter>
          <Button onClick={completarComPlano} disabled={submitting} className="w-full">
            {submitting ? "Concluindo..." : "Concluir atendimento"}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitAvulso)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="valor-pagamento">Valor</Label>
        <Input
          id="valor-pagamento"
          type="number"
          min={0}
          step={0.01}
          {...register("valor", { valueAsNumber: true })}
        />
        {errors.valor ? (
          <p className="text-sm text-destructive">{errors.valor.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Forma de pagamento</Label>
        <Controller
          name="formaPagamento"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: FormaPagamento | null) =>
                    FORMAS.find((f) => f.value === value)?.label ?? "Escolha..."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FORMAS.map((forma) => (
                  <SelectItem key={forma.value} value={forma.value}>
                    {forma.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.formaPagamento ? (
          <p className="text-sm text-destructive">{errors.formaPagamento.message}</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Concluindo..." : "Concluir atendimento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PaymentModal({
  open,
  formKey,
  appointment,
  service,
  client,
  existingPayment,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  formKey: number;
  appointment: AgendaAppointment | null;
  service: AgendaService | null;
  client: AgendaClient | null;
  existingPayment: AgendaPayment | undefined;
  onOpenChange: (open: boolean) => void;
  onCompleted: (payment: AgendaPayment) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingPayment ? "Pagamento do atendimento" : "Concluir e receber"}
          </DialogTitle>
        </DialogHeader>
        {open && appointment && service && client ? (
          <PaymentForm
            key={formKey}
            appointment={appointment}
            service={service}
            client={client}
            existingPayment={existingPayment}
            onOpenChange={onOpenChange}
            onCompleted={onCompleted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
