"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resumeOnboardingAction } from "./actions";

export function OnboardingPendingAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    setLoading(true);
    setError(null);
    const resultado = await resumeOnboardingAction();
    if (!resultado.ok) {
      setLoading(false);
      setError(resultado.error);
      return;
    }
    window.location.href = resultado.url;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>Cadastro bancário pendente</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Você ainda não completou o cadastro bancário com a Stripe — sem
          isso, suas comissões não podem ser recebidas.
        </p>
        {error ? <p className="text-sm font-medium">{error}</p> : null}
        <Button size="sm" onClick={handleResume} disabled={loading}>
          {loading ? "Aguarde..." : "Completar cadastro"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
