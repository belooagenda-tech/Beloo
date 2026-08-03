"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlanFormDialog } from "./plan-form-dialog";
import type { PlanListItem, PlanServiceLookup } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PlansManager({
  businessId,
  services,
  initialPlans,
  mpConnected,
}: {
  businessId: string;
  services: PlanServiceLookup[];
  initialPlans: PlanListItem[];
  mpConnected: boolean;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<PlanListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const servicesById = new Map(services.map((s) => [s.id, s.nome]));

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(plan: PlanListItem) {
    setEditing(plan);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSaved(plan: PlanListItem) {
    setPlans((prev) => {
      const existe = prev.some((p) => p.id === plan.id);
      return existe ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_plans").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      toast.error(
        error.code === "23503"
          ? "Esse plano tem clientes vinculados e não pode ser excluído. Desative-o em vez disso."
          : "Não foi possível excluir o plano.",
      );
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Plano excluído.");
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="size-4" />
        Novo plano
      </Button>

      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum plano cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatarPreco(plan.valor_mensal)}/mês · ciclo de {plan.ciclo_dias} dias
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {plan.permite_pagamento_online ? (
                        <Badge className="bg-primary/10 text-primary" variant="secondary">
                          Pagamento online
                        </Badge>
                      ) : null}
                      {!plan.ativo ? <Badge variant="secondary">Inativo</Badge> : null}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(plan)} aria-label="Editar plano">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(plan)}
                        aria-label="Excluir plano"
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.servicos_inclusos.map((item) => (
                      <Badge key={item.service_id} variant="secondary">
                        {servicesById.get(item.service_id) ?? "Serviço removido"}
                        {item.quantidade === null ? " · ilimitado" : ` · ${item.quantidade}x`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PlanFormDialog
        businessId={businessId}
        services={services}
        plan={editing}
        open={dialogOpen}
        formKey={dialogKey}
        mpConnected={mpConnected}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{deleteTarget?.nome}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se houver clientes com esse
              plano ativo, desative-o em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
