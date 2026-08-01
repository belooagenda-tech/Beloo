"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatISO } from "date-fns";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AvailablePlan } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AssignPlanForm({
  clientId,
  availablePlans,
  onOpenChange,
}: {
  clientId: string;
  availablePlans: AvailablePlan[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(availablePlans[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    const plan = availablePlans.find((p) => p.id === planId);
    if (!plan) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const hoje = new Date();
    const { error: insertError } = await supabase.from("client_plan_subs").insert({
      client_id: clientId,
      plan_id: plan.id,
      data_inicio: formatISO(hoje, { representation: "date" }),
      data_renovacao: formatISO(addDays(hoje, plan.ciclo_dias), { representation: "date" }),
      creditos_usados: {},
      ativo: true,
    });
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Esse cliente já tem um plano ativo."
          : "Não foi possível atribuir o plano. Tente novamente.",
      );
      return;
    }

    toast.success("Plano atribuído.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Select value={planId} onValueChange={(value) => setPlanId(value ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolha um plano" />
        </SelectTrigger>
        <SelectContent>
          {availablePlans.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.nome} · {formatarPreco(plan.valor_mensal)}/mês
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DialogFooter>
        <Button onClick={handleAssign} disabled={submitting || !planId} className="w-full">
          {submitting ? "Atribuindo..." : "Atribuir plano"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AssignPlanDialog({
  clientId,
  availablePlans,
}: {
  clientId: string;
  availablePlans: AvailablePlan[];
}) {
  const [open, setOpen] = useState(false);

  if (availablePlans.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Repeat className="size-4" />
            Atribuir plano
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir plano</DialogTitle>
        </DialogHeader>
        {open ? (
          <AssignPlanForm clientId={clientId} availablePlans={availablePlans} onOpenChange={setOpen} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
