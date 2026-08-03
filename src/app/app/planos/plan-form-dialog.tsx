"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { planSchema, type PlanInput, type ServicoIncluso } from "@/lib/validations/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import type { PlanListItem, PlanServiceLookup } from "./types";

function itensIniciais(plan: PlanListItem | null): ServicoIncluso[] {
  if (!plan) return [];
  return plan.servicos_inclusos.map((item) => ({
    serviceId: item.service_id,
    ilimitado: item.quantidade === null,
    quantidade: item.quantidade ?? 1,
  }));
}

function PlanForm({
  businessId,
  services,
  plan,
  mpConnected,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  services: PlanServiceLookup[];
  plan: PlanListItem | null;
  mpConnected: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (plan: PlanListItem) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      nome: plan?.nome ?? "",
      valorMensal: plan?.valor_mensal ?? 0,
      cicloDias: plan?.ciclo_dias ?? 30,
    },
  });

  const [itens, setItens] = useState<ServicoIncluso[]>(itensIniciais(plan));
  const [ativo, setAtivo] = useState(plan?.ativo ?? true);
  const [permitePagamentoOnline, setPermitePagamentoOnline] = useState(
    plan?.permite_pagamento_online ?? false,
  );
  const [itensError, setItensError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servicosDisponiveis = services.filter((s) => !itens.some((i) => i.serviceId === s.id));

  function addItem() {
    const proximo = servicosDisponiveis[0];
    if (!proximo) return;
    setItens((prev) => [...prev, { serviceId: proximo.id, ilimitado: false, quantidade: 1 }]);
    setItensError(null);
  }

  function updateItem(index: number, patch: Partial<ServicoIncluso>) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: PlanInput) {
    if (itens.length === 0) {
      setItensError("Inclua pelo menos um serviço no plano.");
      return;
    }
    setItensError(null);
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      business_id: businessId,
      nome: values.nome,
      valor_mensal: values.valorMensal,
      ciclo_dias: values.cicloDias,
      servicos_inclusos: itens.map((item) => ({
        service_id: item.serviceId,
        quantidade: item.ilimitado ? null : item.quantidade,
      })),
      ativo,
      permite_pagamento_online: permitePagamentoOnline,
    };

    const query = plan
      ? supabase.from("client_plans").update(payload).eq("id", plan.id)
      : supabase.from("client_plans").insert(payload);

    const { data, error: saveError } = await query
      .select("id, nome, valor_mensal, servicos_inclusos, ciclo_dias, ativo, permite_pagamento_online")
      .single();
    setSubmitting(false);

    if (saveError || !data) {
      setError("Não foi possível salvar o plano. Tente novamente.");
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
        <Label htmlFor="nome-plano">Nome do plano</Label>
        <Input id="nome-plano" placeholder="Unha em Dia" {...register("nome")} />
        {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="valor-plano">Valor mensal (R$)</Label>
          <Input
            id="valor-plano"
            type="number"
            min={0}
            step={0.01}
            {...register("valorMensal", { valueAsNumber: true })}
          />
          {errors.valorMensal ? (
            <p className="text-sm text-destructive">{errors.valorMensal.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ciclo-plano">Ciclo (dias)</Label>
          <Input
            id="ciclo-plano"
            type="number"
            min={1}
            max={365}
            {...register("cicloDias", { valueAsNumber: true })}
          />
          {errors.cicloDias ? (
            <p className="text-sm text-destructive">{errors.cicloDias.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Serviços inclusos</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addItem}
            disabled={servicosDisponiveis.length === 0}
            className="text-primary hover:text-primary"
          >
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço incluso ainda.</p>
        ) : (
          <div className="space-y-2">
            {itens.map((item, index) => (
              <div key={item.serviceId} className="flex items-center gap-2 rounded-md border border-border p-2">
                <Select
                  value={item.serviceId}
                  onValueChange={(value) => value && updateItem(index, { serviceId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={item.serviceId}>
                      {services.find((s) => s.id === item.serviceId)?.nome ?? "Serviço"}
                    </SelectItem>
                    {servicosDisponiveis.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!item.ilimitado ? (
                  <Input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, { quantidade: Number(e.target.value) })}
                    className="w-16"
                  />
                ) : null}

                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={item.ilimitado}
                    onCheckedChange={(checked) => updateItem(index, { ilimitado: checked })}
                  />
                  <span className="text-xs whitespace-nowrap text-muted-foreground">Ilimitado</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  aria-label="Remover serviço"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {itensError ? <p className="text-sm text-destructive">{itensError}</p> : null}
      </div>

      {plan ? (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <p className="text-sm font-medium text-foreground">Plano ativo</p>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
      ) : null}

      <div className="space-y-1.5 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="permite-pagamento-online" className="text-sm font-medium text-foreground">
            Permitir pagamento online
          </Label>
          <Switch
            id="permite-pagamento-online"
            checked={permitePagamentoOnline}
            disabled={!mpConnected}
            onCheckedChange={setPermitePagamentoOnline}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {mpConnected
            ? "O cliente pode assinar e pagar esse plano pelo link, com cartão (cobrança automática) ou Pix (por ciclo)."
            : "Conecte sua conta do Mercado Pago em Configurações para poder ativar isso."}
        </p>
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar plano"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PlanFormDialog({
  businessId,
  services,
  plan,
  open,
  formKey,
  mpConnected,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  services: PlanServiceLookup[];
  plan: PlanListItem | null;
  open: boolean;
  formKey: number;
  mpConnected: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (plan: PlanListItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        {open ? (
          <PlanForm
            key={formKey}
            businessId={businessId}
            services={services}
            plan={plan}
            mpConnected={mpConnected}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
