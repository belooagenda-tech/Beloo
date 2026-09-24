"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSaasSubscriptionStripeAction, subscribeToSaasBillingStripeAction } from "./stripe-actions";
import { PLAN_LABELS } from "@/lib/plan/features";
import type { PlanTier } from "@/lib/supabase/types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PRO_ITEMS = [
  "Agendamentos ilimitados",
  "Lembretes automáticos, reengajamento e lista de espera",
  "Pix automático via Mercado Pago",
  "Planos recorrentes para clientes",
  "Relatórios financeiros e QR Code",
  "Avaliações dos clientes",
];

const STUDIO_ITEMS = ["Tudo do Pro", "Múltiplos profissionais na mesma agenda"];

export function PlanPicker({
  currentTier,
  valorPro,
  valorStudio,
  temAssinaturaAtiva,
}: {
  currentTier: PlanTier;
  valorPro: number;
  valorStudio: number;
  temAssinaturaAtiva: boolean;
}) {
  const [assinando, setAssinando] = useState<"pro" | "studio" | null>(null);
  const [cancelando, setCancelando] = useState(false);

  async function handleAssinar(tier: "pro" | "studio") {
    setAssinando(tier);
    const resultado = await subscribeToSaasBillingStripeAction(tier);
    if (!resultado.ok) {
      setAssinando(null);
      toast.error(resultado.error);
      return;
    }
    window.location.href = resultado.url;
  }

  async function handleCancelar() {
    setCancelando(true);
    const resultado = await cancelSaasSubscriptionStripeAction();
    setCancelando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Assinatura cancelada — voltou pro plano Grátis.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-5">
          <div>
            <p className="text-sm text-muted-foreground">Seu plano atual</p>
            <p className="text-lg font-semibold text-foreground">{PLAN_LABELS[currentTier]}</p>
          </div>
          {currentTier === "gratis" ? (
            <Badge variant="outline">
              <CircleAlert className="size-3" /> Limitado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Check className="size-3" /> Ativo
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {currentTier !== "studio" ? (
          <Card className={currentTier === "gratis" ? "border-primary" : undefined}>
            <CardHeader>
              <CardTitle className="text-base">Pro</CardTitle>
              <p className="text-2xl font-semibold text-foreground">
                {formatarPreco(valorPro)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PRO_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                disabled={assinando !== null}
                onClick={() => handleAssinar("pro")}
              >
                {assinando === "pro" ? "Preparando pagamento..." : "Assinar Pro"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Studio</CardTitle>
            <p className="text-2xl font-semibold text-foreground">
              {formatarPreco(valorStudio)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {STUDIO_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={currentTier === "gratis" ? "outline" : "default"}
              disabled={assinando !== null}
              onClick={() => handleAssinar("studio")}
            >
              {assinando === "studio" ? "Preparando pagamento..." : "Assinar Studio"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {temAssinaturaAtiva ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" disabled={cancelando}>
                {cancelando ? "Cancelando..." : "Cancelar assinatura"}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar sua assinatura?</AlertDialogTitle>
              <AlertDialogDescription>
                Você volta pro plano Grátis assim que o período atual terminar — limitado a 30
                agendamentos/mês e 1 profissional. Pode assinar de novo quando quiser.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelar}>Cancelar assinatura</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
