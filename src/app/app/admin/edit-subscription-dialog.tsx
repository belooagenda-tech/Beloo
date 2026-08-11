"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { updateSubscriptionAction } from "./actions";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";
import type { ProfessionalRow } from "./professionals-table";

const STATUS_OPCOES: { value: SaasSubscriptionStatus; label: string }[] = [
  { value: "trial", label: "Teste grátis" },
  { value: "ativo", label: "Ativo" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

// Aproximação suficiente pra popular um <input type="date">: os dois campos
// só importam pelo dia marcado, não pelo horário exato armazenado.
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function EditSubscriptionDialog({ row }: { row: ProfessionalRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SaasSubscriptionStatus>(row.status);
  const [trialEndsAt, setTrialEndsAt] = useState(toDateInputValue(row.trialEndsAt));
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(toDateInputValue(row.currentPeriodEnd));
  const [salvando, setSalvando] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reseta pros valores atuais do servidor sempre que reabre — evita
      // reaproveitar um rascunho de uma edição anterior cancelada.
      setStatus(row.status);
      setTrialEndsAt(toDateInputValue(row.trialEndsAt));
      setCurrentPeriodEnd(toDateInputValue(row.currentPeriodEnd));
    }
  }

  async function handleSalvar() {
    if (!trialEndsAt) {
      toast.error("Informe a data do trial.");
      return;
    }
    setSalvando(true);
    const resultado = await updateSubscriptionAction({
      businessId: row.id,
      status,
      trialEndsAt,
      currentPeriodEnd: currentPeriodEnd || null,
    });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Vencimento atualizado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Editar vencimento de ${row.nomeLoja}`}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vencimento — {row.nomeLoja}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => v && setStatus(v as SaasSubscriptionStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    STATUS_OPCOES.find((o) => o.value === value)?.label ?? "Escolha..."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trial-ate">Trial até</Label>
            <Input
              id="trial-ate"
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proxima-cobranca">Próxima cobrança</Label>
            <Input
              id="proxima-cobranca"
              type="date"
              value={currentPeriodEnd}
              onChange={(e) => setCurrentPeriodEnd(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Deixe em branco se não se aplica.</p>
          </div>

          <p className="text-xs text-muted-foreground">
            As datas marcam o fim do dia escolhido (23:59, horário de Brasília) — o profissional
            continua com acesso liberado até lá.
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
