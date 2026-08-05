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

function round2(valor: number) {
  return Math.round(valor * 100) / 100;
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

  // Valor da entrada que o cliente já pagou online (Mercado Pago) antes do
  // atendimento. Continua valendo mesmo depois de concluído (entrada_status
  // só muda para "reembolsado"/"expirado" em cancelamento/expiração), então
  // dá pra usar esse mesmo cálculo tanto para concluir quanto para editar um
  // pagamento já registrado.
  const entradaJaPaga = appointment.entrada_status === "pago" ? (appointment.entrada_valor ?? 0) : 0;

  // Quanto falta cobrar do cliente agora. Antes da conclusão, o único
  // registro que pode existir em appointment_payments é a própria entrada
  // (valor = entradaJaPaga) — nesse caso o restante é sempre serviço menos
  // entrada. Editando um atendimento já concluído, existingPayment.valor é o
  // TOTAL que ficou registrado da última vez, então o restante é esse total
  // menos a entrada (que nunca muda depois de paga).
  const valorRestantePadrao =
    jaConcluido && existingPayment
      ? Math.max(round2(existingPayment.valor - entradaJaPaga), 0)
      : Math.max(round2(service.preco - entradaJaPaga), 0);

  const totalmenteCobertoPelaEntrada = entradaJaPaga > 0 && valorRestantePadrao <= 0;

  const [coverage, setCoverage] = useState<PlanCoverage | null>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(!jaConcluido && !existingPayment);
  const [forcarAvulso, setForcarAvulso] = useState(false);
  const [ajustarValor, setAjustarValor] = useState(!totalmenteCobertoPelaEntrada);
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
      valor: valorRestantePadrao,
      formaPagamento:
        existingPayment && existingPayment.origem === "avulso" && !entradaJaPaga
          ? (existingPayment.forma_pagamento as AvulsoPaymentInput["formaPagamento"])
          : undefined,
    },
  });

  useEffect(() => {
    // Já existe um registro de pagamento (seja a entrada online, seja um
    // atendimento já concluído) — não há cobertura de plano a checar, o
    // dinheiro já entrou (ou já foi registrado) por outro caminho.
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
      entrada_valor: null,
    });
    onOpenChange(false);
  }

  // Entrada online cobre o valor total do serviço — não sobra nada pra
  // cobrar na hora, só confirmar a conclusão.
  async function concluirComEntradaTotal() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_appointment_payment", {
      p_appointment_id: appointment.id,
      p_valor: entradaJaPaga,
      p_forma_pagamento: "entrada_mp",
      p_origem: "avulso",
      p_entrada_valor: entradaJaPaga,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(mensagemErroRpc(rpcError.message));
      return;
    }

    onCompleted({
      id: existingPayment?.id ?? "",
      appointment_id: appointment.id,
      valor: entradaJaPaga,
      forma_pagamento: "entrada_mp",
      origem: "avulso",
      entrada_valor: entradaJaPaga,
    });
    onOpenChange(false);
  }

  async function onSubmitAvulso(values: AvulsoPaymentInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    // O valor total registrado é sempre entrada + o que está sendo cobrado
    // agora — nunca sobrescreve a entrada, só soma o que falta. A forma de
    // pagamento reflete que parte veio online: "entrada_mp" quando a entrada
    // cobriu tudo, "misto" quando teve parte online e parte na hora.
    const totalValor = round2(entradaJaPaga + values.valor);
    const formaFinal: FormaPagamento =
      entradaJaPaga > 0 ? (values.valor > 0 ? "misto" : "entrada_mp") : values.formaPagamento;

    const { error: rpcError } = await supabase.rpc("complete_appointment_payment", {
      p_appointment_id: appointment.id,
      p_valor: totalValor,
      p_forma_pagamento: formaFinal,
      p_origem: "avulso",
      p_entrada_valor: entradaJaPaga,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(mensagemErroRpc(rpcError.message));
      return;
    }

    onCompleted({
      id: existingPayment?.id ?? "",
      appointment_id: appointment.id,
      valor: totalValor,
      forma_pagamento: formaFinal,
      origem: "avulso",
      entrada_valor: entradaJaPaga > 0 ? entradaJaPaga : null,
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

  const entradaInfo =
    entradaJaPaga > 0 ? (
      <Alert>
        <AlertDescription>
          Cliente já pagou <strong>{formatarPreco(entradaJaPaga)}</strong> de entrada pelo
          Mercado Pago{service.preco > entradaJaPaga ? ` (de ${formatarPreco(service.preco)})` : ""}.
          Isso já está contado no Financeiro — não cobre esse valor de novo.
        </AlertDescription>
      </Alert>
    ) : null;

  // Entrada cobriu o valor todo e o profissional ainda não pediu pra ajustar
  // — só confirma a conclusão, sem pedir forma de pagamento pro que já foi
  // pago online.
  if (totalmenteCobertoPelaEntrada && !ajustarValor) {
    return (
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {entradaInfo}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={concluirComEntradaTotal} disabled={submitting} className="w-full">
            {submitting ? "Concluindo..." : "Concluir atendimento"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setAjustarValor(true)}
          >
            Cobrar valor adicional
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

      {entradaInfo}

      <div className="space-y-1.5">
        <Label htmlFor="valor-pagamento">
          {entradaJaPaga > 0 ? "Valor a cobrar agora (restante)" : "Valor"}
        </Label>
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
            {appointment?.status === "concluido" ? "Pagamento do atendimento" : "Concluir e receber"}
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
