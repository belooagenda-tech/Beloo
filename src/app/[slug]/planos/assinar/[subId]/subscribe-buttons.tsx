"use client";

import { useState } from "react";
import { CreditCard, QrCode } from "lucide-react";
import { subscribeToPlanWithCardAction, subscribeToPlanWithPixAction } from "../../../plan-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export function SubscribeButtons({ slug, subId }: { slug: string; subId: string }) {
  const [email, setEmail] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCard() {
    setError(null);
    setLoadingCard(true);
    const resultado = await subscribeToPlanWithCardAction(slug, subId, email);
    if (!resultado.ok) {
      setLoadingCard(false);
      setError(resultado.error);
      return;
    }
    window.location.href = resultado.url;
  }

  async function handlePix() {
    setError(null);
    setLoadingPix(true);
    const resultado = await subscribeToPlanWithPixAction(slug, subId);
    if (!resultado.ok) {
      setLoadingPix(false);
      setError(resultado.error);
      return;
    }
    window.location.href = resultado.url;
  }

  const submitting = loadingCard || loadingPix;

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Cartão de crédito</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cobrança automática todo mês — você não precisa pagar de novo a
            cada ciclo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="email-assinatura" className="sr-only">
              E-mail
            </Label>
            <Input
              id="email-assinatura"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleCard} disabled={submitting || !email}>
            {loadingCard ? "Aguarde..." : "Assinar com cartão"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Pix</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Você paga este ciclo agora e recebe um novo link a cada mês para
            renovar.
          </p>
          <Button variant="outline" className="w-full" onClick={handlePix} disabled={submitting}>
            {loadingPix ? "Aguarde..." : "Pagar este ciclo com Pix"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
