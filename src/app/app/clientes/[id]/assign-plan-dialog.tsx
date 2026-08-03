"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatISO } from "date-fns";
import { toast } from "sonner";
import { Check, Copy, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { createPlanSubRequestAction } from "./plan-sub-actions";
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

function LinkStep({ link, telefone, onDone }: { link: string; telefone: string; onDone: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const telefoneNormalizado = normalizePhone(telefone);
  const whatsappUrl = `https://wa.me/55${telefoneNormalizado}?text=${encodeURIComponent(
    `Oi! Segue o link para assinar o plano: ${link}`,
  )}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Envie esse link para o cliente completar o pagamento e ativar o plano.
        </AlertDescription>
      </Alert>
      <div className="flex items-center gap-2 rounded-md border border-border p-2">
        <p className="flex-1 truncate text-sm text-muted-foreground">{link}</p>
        <Button type="button" variant="ghost" size="icon" onClick={handleCopy} aria-label="Copiar link">
          {copiado ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Button nativeButton={false} render={<a href={whatsappUrl} target="_blank" rel="noreferrer" />}>
          Enviar pelo WhatsApp
        </Button>
        <Button variant="outline" onClick={onDone}>
          Concluir
        </Button>
      </div>
    </div>
  );
}

function AssignPlanForm({
  clientId,
  clientTelefone,
  slug,
  availablePlans,
  onOpenChange,
}: {
  clientId: string;
  clientTelefone: string;
  slug: string;
  availablePlans: AvailablePlan[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(availablePlans[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const plan = availablePlans.find((p) => p.id === planId);

  async function handleAssign() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);

    if (plan.permite_pagamento_online) {
      const resultado = await createPlanSubRequestAction(clientId, plan.id);
      setSubmitting(false);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      setLink(`${siteUrl}/${slug}/planos/assinar/${resultado.subId}`);
      return;
    }

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

  function handleDone() {
    onOpenChange(false);
    router.refresh();
  }

  if (link) {
    return <LinkStep link={link} telefone={clientTelefone} onDone={handleDone} />;
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
          <SelectValue>
            {(value: string | null) => {
              const p = availablePlans.find((item) => item.id === value);
              if (!p) return "Escolha um plano";
              return `${p.nome} · ${formatarPreco(p.valor_mensal)}/mês${p.permite_pagamento_online ? " · pagamento online" : ""}`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availablePlans.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome} · {formatarPreco(p.valor_mensal)}/mês
              {p.permite_pagamento_online ? " · pagamento online" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {plan?.permite_pagamento_online ? (
        <p className="text-xs text-muted-foreground">
          Esse plano é pago online — você vai receber um link para enviar ao
          cliente em vez de ativar na hora.
        </p>
      ) : null}

      <DialogFooter>
        <Button onClick={handleAssign} disabled={submitting || !planId} className="w-full">
          {submitting
            ? "Aguarde..."
            : plan?.permite_pagamento_online
              ? "Gerar link de pagamento"
              : "Atribuir plano"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AssignPlanDialog({
  clientId,
  clientTelefone,
  slug,
  availablePlans,
}: {
  clientId: string;
  clientTelefone: string;
  slug: string;
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
          <AssignPlanForm
            clientId={clientId}
            clientTelefone={clientTelefone}
            slug={slug}
            availablePlans={availablePlans}
            onOpenChange={setOpen}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
