"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatISO } from "date-fns";
import { toast } from "sonner";
import { RefreshCw, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActivePlan } from "./types";

export function PlanActions({ plan }: { plan: ActivePlan }) {
  const router = useRouter();
  const [renewing, setRenewing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleRenew() {
    setRenewing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("client_plan_subs")
      .update({
        data_renovacao: formatISO(addDays(new Date(), plan.cicloDias), { representation: "date" }),
        creditos_usados: {},
      })
      .eq("id", plan.subId);
    setRenewing(false);

    if (error) {
      toast.error("Não foi possível renovar o ciclo.");
      return;
    }
    toast.success("Ciclo renovado.");
    router.refresh();
  }

  async function handleCancel() {
    setCancelling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("client_plan_subs")
      .update({ ativo: false })
      .eq("id", plan.subId);
    setCancelling(false);

    if (error) {
      toast.error("Não foi possível cancelar o plano.");
      return;
    }
    toast.success("Plano cancelado.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleRenew} disabled={renewing}>
        <RefreshCw className="size-4" />
        {renewing ? "Renovando..." : "Renovar ciclo"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm">
              <XCircle className="size-4" />
              Cancelar plano
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o plano deste cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente deixa de ter acesso aos créditos do plano nos próximos
              atendimentos. Você pode atribuir um plano novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Cancelar plano"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
