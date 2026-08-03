"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, formatISO } from "date-fns";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidBrazilianPhone, normalizePhone } from "@/lib/phone";
import { ClientPicker, type PickedClient } from "@/components/client-picker";
import { PlanPaymentLinkStep } from "@/components/plan-payment-link-step";
import { createPlanSubRequestAction } from "../clientes/[id]/plan-sub-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PlanListItem } from "./types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AssignPlanToClientForm({
  businessId,
  slug,
  plan,
  onOpenChange,
}: {
  businessId: string;
  slug: string;
  plan: PlanListItem;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<PickedClient | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function resolveClientId(): Promise<{ id: string; telefone: string } | { error: string }> {
    if (selectedClient) return { id: selectedClient.id, telefone: selectedClient.telefone };

    if (nome.trim().length < 2) return { error: "Informe o nome do cliente." };
    if (!isValidBrazilianPhone(telefone)) return { error: "Informe um WhatsApp válido." };

    const supabase = createClient();
    const telefoneNormalizado = normalizePhone(telefone);

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, telefone")
      .eq("business_id", businessId)
      .eq("telefone", telefoneNormalizado)
      .maybeSingle();
    if (existingClient) return { id: existingClient.id, telefone: existingClient.telefone };

    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ business_id: businessId, nome: nome.trim(), telefone: telefoneNormalizado })
      .select("id, telefone")
      .single();
    if (clientError || !newClient) return { error: "Não foi possível salvar o cliente. Tente novamente." };

    return { id: newClient.id, telefone: newClient.telefone };
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);

    const client = await resolveClientId();
    if ("error" in client) {
      setSubmitting(false);
      setError(client.error);
      return;
    }

    if (plan.permite_pagamento_online) {
      const resultado = await createPlanSubRequestAction(client.id, plan.id);
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
      client_id: client.id,
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
    return (
      <PlanPaymentLinkStep
        link={link}
        telefone={selectedClient?.telefone ?? telefone}
        onDone={handleDone}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {plan.nome} · {formatarPreco(plan.valor_mensal)}/mês
      </p>

      <ClientPicker businessId={businessId} onSelect={setSelectedClient} />

      {!selectedClient ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="nome-novo-cliente">Nome do cliente</Label>
            <Input id="nome-novo-cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone-novo-cliente">WhatsApp</Label>
            <Input
              id="telefone-novo-cliente"
              placeholder="(21) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
        </>
      ) : null}

      {plan.permite_pagamento_online ? (
        <p className="text-xs text-muted-foreground">
          Esse plano é pago online — você vai receber um link para enviar ao
          cliente em vez de ativar na hora.
        </p>
      ) : null}

      <DialogFooter>
        <Button onClick={handleAssign} disabled={submitting} className="w-full">
          {submitting
            ? "Aguarde..."
            : plan.permite_pagamento_online
              ? "Gerar link de pagamento"
              : "Atribuir plano"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AssignPlanDialog({
  businessId,
  slug,
  plan,
}: {
  businessId: string;
  slug: string;
  plan: PlanListItem;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus className="size-4" />
            Atribuir a cliente
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir &ldquo;{plan.nome}&rdquo;</DialogTitle>
        </DialogHeader>
        {open ? (
          <AssignPlanToClientForm
            key={formKey}
            businessId={businessId}
            slug={slug}
            plan={plan}
            onOpenChange={setOpen}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
