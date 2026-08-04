"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toggleBillingAction } from "./actions";

export function BillingSettingsCard({
  initialEnabled,
  initialValorMensal,
  billingEnabledAt,
  trialDias,
}: {
  initialEnabled: boolean;
  initialValorMensal: number;
  billingEnabledAt: string | null;
  trialDias: number;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [valorMensal, setValorMensal] = useState(String(initialValorMensal));
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(nextEnabled: boolean) {
    const preco = Number(valorMensal.replace(",", "."));
    if (Number.isNaN(preco) || preco <= 0) {
      toast.error("Informe um preço válido.");
      setEnabled(!nextEnabled);
      return;
    }

    setSalvando(true);
    const resultado = await toggleBillingAction({ enabled: nextEnabled, valorMensal: preco });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      setEnabled(!nextEnabled);
      return;
    }

    toast.success(
      nextEnabled ? "Cobrança ativada — trial de todo mundo foi resetado." : "Cobrança desativada.",
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cobrança da Beloo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="billing-enabled" className="text-sm font-medium text-foreground">
              Ativar cobrança
            </Label>
            <p className="text-xs text-muted-foreground">
              Ao ativar, todo profissional que ainda está em teste ganha {trialDias} dias grátis a
              partir de agora.
            </p>
          </div>
          <Switch
            id="billing-enabled"
            checked={enabled}
            disabled={salvando}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              handleSalvar(checked);
            }}
          />
        </div>

        <div className="space-y-1.5 border-t border-border pt-4">
          <Label htmlFor="valor-mensal">Preço da assinatura (R$/mês)</Label>
          <div className="flex gap-2">
            <Input
              id="valor-mensal"
              inputMode="decimal"
              value={valorMensal}
              disabled={salvando}
              onChange={(e) => setValorMensal(e.target.value)}
              className="max-w-32"
            />
            <Button variant="outline" disabled={salvando} onClick={() => handleSalvar(enabled)}>
              Salvar preço
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Só vale para novas assinaturas — quem já assinou mantém o valor combinado até cancelar.
          </p>
        </div>

        {billingEnabledAt ? (
          <p className="text-xs text-muted-foreground">
            Cobrança ativada em {new Date(billingEnabledAt).toLocaleString("pt-BR")}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
