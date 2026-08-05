"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock } from "lucide-react";
import { clientInfoSchema, type ClientInfoInput } from "@/lib/validations/public-booking";
import { requestPlanSubscriptionAction } from "./plan-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PublicPlan, PublicService } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SubscribeForm({
  slug,
  plan,
  onOpenChange,
}: {
  slug: string;
  plan: PublicPlan;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
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
    const resultado = await requestPlanSubscriptionAction(
      slug,
      plan.id,
      values.nome,
      values.telefone,
      values.empresa,
    );
    if (!resultado.ok) {
      setSubmitting(false);
      setError(resultado.error);
      return;
    }
    onOpenChange(false);
    router.push(`/${slug}/planos/assinar/${resultado.subId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="telefone-plano">WhatsApp</Label>
        <Input
          id="telefone-plano"
          placeholder="(21) 99999-9999"
          autoComplete="tel"
          {...register("telefone")}
        />
        {errors.telefone ? (
          <p className="text-sm text-destructive">{errors.telefone.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome-plano">Seu nome</Label>
        <Input id="nome-plano" placeholder="Como podemos te chamar" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      {/* Campo-armadilha contra bots, mesmo padrão do formulário de agendamento. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="empresa-honeypot-plano">Não preencha este campo</label>
        <input
          id="empresa-honeypot-plano"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("empresa")}
        />
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Aguarde..." : "Ir para pagamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PlanCard({
  slug,
  plan,
  servicesById,
}: {
  slug: string;
  plan: PublicPlan;
  servicesById: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{plan.nome}</p>
          <p className="text-sm text-muted-foreground">
            {formatarPreco(plan.valor_mensal)}/mês · ciclo de {plan.ciclo_dias} dias
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.servicos_inclusos.map((item) => (
            <Badge key={item.service_id} variant="secondary">
              {servicesById.get(item.service_id) ?? "Serviço"}
              {item.quantidade === null ? " · ilimitado" : ` · ${item.quantidade}x`}
            </Badge>
          ))}
        </div>

        {plan.permite_pagamento_online ? (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setFormKey((k) => k + 1);
            }}
          >
            <DialogTrigger render={<Button className="w-full">Assinar agora</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assinar &ldquo;{plan.nome}&rdquo;</DialogTitle>
              </DialogHeader>
              {open ? <SubscribeForm key={formKey} slug={slug} plan={plan} onOpenChange={setOpen} /> : null}
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-muted-foreground">Fale com a loja para contratar esse plano.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PlansSection({
  slug,
  plans,
  services,
}: {
  slug: string;
  plans: PublicPlan[];
  services: PublicService[];
}) {
  if (plans.length === 0) return null;

  const servicesById = new Map(services.map((s) => [s.id, s.nome]));

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Planos</h2>
      </div>
      <div className="space-y-2">
        {plans.map((plan) => (
          <PlanCard key={plan.id} slug={slug} plan={plan} servicesById={servicesById} />
        ))}
      </div>
    </div>
  );
}
