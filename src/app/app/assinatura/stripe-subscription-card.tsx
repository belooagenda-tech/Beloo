"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, CircleAlert } from "lucide-react";
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
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Mesma UI/UX do SaasSubscriptionCard (Mercado Pago) — só troca as actions
// por baixo pro fluxo Stripe. Usado só quando o negócio ainda não tem
// nenhuma assinatura no Mercado Pago (ver branch em page.tsx).
export function StripeSubscriptionCard({
  status,
  trialEndsAt,
  currentPeriodEnd,
  valorMensal,
}: {
  status: SaasSubscriptionStatus;
  trialEndsAt: string;
  currentPeriodEnd: string | null;
  valorMensal: number;
}) {
  const [assinando, setAssinando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [now] = useState(() => Date.now());

  const emTrial = status === "trial" && new Date(trialEndsAt).getTime() > now;
  const ativo =
    status === "ativo" && Boolean(currentPeriodEnd) && new Date(currentPeriodEnd!).getTime() > now;
  const diasRestantes = Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24)),
  );

  async function handleAssinar() {
    setAssinando(true);
    const resultado = await subscribeToSaasBillingStripeAction();
    if (!resultado.ok) {
      setAssinando(false);
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
    toast.success("Assinatura cancelada.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assinatura Beloo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{formatarPreco(valorMensal)}/mês</p>
            <p className="text-sm text-muted-foreground">Acesso completo à sua agenda e clientes.</p>
          </div>
          {ativo ? (
            <Badge variant="secondary">
              <CheckCircle2 className="size-3" /> Ativa
            </Badge>
          ) : emTrial ? (
            <Badge variant="outline">
              <CalendarClock className="size-3" /> Teste grátis
            </Badge>
          ) : (
            <Badge variant="destructive">
              <CircleAlert className="size-3" /> Pendente
            </Badge>
          )}
        </div>

        {ativo ? (
          <p className="text-sm text-muted-foreground">
            Próxima cobrança em {formatarData(currentPeriodEnd!)}.
          </p>
        ) : emTrial ? (
          <p className="text-sm text-muted-foreground">
            Faltam {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"} do seu teste grátis. Assine
            para continuar usando a Beloo sem interrupção.
          </p>
        ) : (
          <p className="text-sm text-destructive">
            Seu acesso está bloqueado até a assinatura ser confirmada.
          </p>
        )}

        {ativo ? (
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
                  Sua agenda fica inacessível assim que o período atual terminar. Você pode assinar de
                  novo a qualquer momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelar}>Cancelar assinatura</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleAssinar} disabled={assinando}>
            {assinando ? "Preparando pagamento..." : "Assinar agora"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
