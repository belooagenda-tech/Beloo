"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { updateBusinessPlanTierAction } from "./actions";
import { PLAN_LABELS } from "@/lib/plan/features";
import type { PlanTier } from "@/lib/supabase/types";
import type { ProfessionalRow } from "./professionals-table";

const TIER_OPCOES: { value: PlanTier; label: string }[] = [
  { value: "gratis", label: PLAN_LABELS.gratis },
  { value: "pro", label: PLAN_LABELS.pro },
  { value: "studio", label: PLAN_LABELS.studio },
];

export function EditPlanTierDialog({ row }: { row: ProfessionalRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>(row.planTier);
  const [salvando, setSalvando] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setPlanTier(row.planTier);
  }

  async function handleSalvar() {
    setSalvando(true);
    const resultado = await updateBusinessPlanTierAction({ businessId: row.id, planTier });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Plano atualizado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Editar plano de ${row.nomeLoja}`}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plano — {row.nomeLoja}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={planTier} onValueChange={(v) => v && setPlanTier(v as PlanTier)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) => TIER_OPCOES.find((o) => o.value === value)?.label ?? "Escolha..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIER_OPCOES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Ajuste manual (ex. cortesia, suporte a um caso específico) — uma assinatura paga
            continua controlando o plano normalmente via Stripe.
          </p>
        </div>
        <DialogFooter>
          <Button className="w-full" disabled={salvando} onClick={handleSalvar}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
