"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { serviceSchema, type ServiceInput } from "@/lib/validations/service";
import { CORES_SERVICO } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function ServiceForm({
  businessId,
  bufferPadrao,
  service,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  bufferPadrao: number;
  service: Service | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: Service) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      nome: service?.nome ?? "",
      duracaoMin: service?.duracao_min ?? 30,
      preco: service?.preco ?? 0,
    },
  });

  const [cor, setCor] = useState(service?.cor ?? CORES_SERVICO[0].valor);
  const [usarBufferPadrao, setUsarBufferPadrao] = useState(
    service ? service.buffer_min === null : true,
  );
  const [bufferMin, setBufferMin] = useState(service?.buffer_min ?? bufferPadrao);
  const [ativo, setAtivo] = useState(service?.ativo ?? true);

  async function onSubmit(values: ServiceInput) {
    const supabase = createClient();
    const payload = {
      business_id: businessId,
      nome: values.nome,
      duracao_min: values.duracaoMin,
      preco: values.preco,
      buffer_min: usarBufferPadrao ? null : bufferMin,
      cor,
      ativo,
    };

    const query = service
      ? supabase.from("services").update(payload).eq("id", service.id)
      : supabase.from("services").insert(payload);

    const { data, error } = await query
      .select("id, business_id, nome, duracao_min, preco, buffer_min, cor, ativo, created_at")
      .single();

    if (error || !data) {
      toast.error("Não foi possível salvar o serviço. Tente novamente.");
      return;
    }

    onSaved(data);
    onOpenChange(false);
    toast.success(service ? "Serviço atualizado." : "Serviço criado.");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="nome-servico">Nome</Label>
          <Input id="nome-servico" placeholder="Manicure simples" {...register("nome")} />
          {errors.nome ? (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="duracao-servico">Duração (min)</Label>
            <Input
              id="duracao-servico"
              type="number"
              min={5}
              step={5}
              {...register("duracaoMin", { valueAsNumber: true })}
            />
            {errors.duracaoMin ? (
              <p className="text-sm text-destructive">{errors.duracaoMin.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preco-servico">Preço (R$)</Label>
            <Input
              id="preco-servico"
              type="number"
              min={0}
              step={0.01}
              {...register("preco", { valueAsNumber: true })}
            />
            {errors.preco ? (
              <p className="text-sm text-destructive">{errors.preco.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cor no calendário</Label>
          <div className="flex gap-2">
            {CORES_SERVICO.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setCor(opcao.valor)}
                aria-label={opcao.label}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                  cor === opcao.valor ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                )}
                style={{ backgroundColor: opcao.valor }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Usar buffer padrão da loja</p>
            <p className="text-sm text-muted-foreground">
              Atualmente {bufferPadrao} min entre atendimentos.
            </p>
          </div>
          <Switch checked={usarBufferPadrao} onCheckedChange={setUsarBufferPadrao} />
        </div>
        {!usarBufferPadrao ? (
          <div className="space-y-1.5">
            <Label htmlFor="buffer-servico">Buffer deste serviço (min)</Label>
            <Input
              id="buffer-servico"
              type="number"
              min={0}
              max={240}
              value={bufferMin}
              onChange={(e) => setBufferMin(Number(e.target.value))}
            />
          </div>
        ) : null}

        {service ? (
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">Serviço ativo</p>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function ServiceFormDialog({
  businessId,
  bufferPadrao,
  service,
  open,
  formKey,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  bufferPadrao: number;
  service: Service | null;
  open: boolean;
  formKey: number;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: Service) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <ServiceForm
            key={formKey}
            businessId={businessId}
            bufferPadrao={bufferPadrao}
            service={service}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
