"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePlanPricesAction } from "./actions";

export function PlanPricesCard({
  initialValorPro,
  initialValorStudio,
}: {
  initialValorPro: number;
  initialValorStudio: number;
}) {
  const router = useRouter();
  const [valorPro, setValorPro] = useState(String(initialValorPro));
  const [valorStudio, setValorStudio] = useState(String(initialValorStudio));
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    const pro = Number(valorPro.replace(",", "."));
    const studio = Number(valorStudio.replace(",", "."));
    if (Number.isNaN(pro) || pro <= 0 || Number.isNaN(studio) || studio <= 0) {
      toast.error("Informe preços válidos.");
      return;
    }

    setSalvando(true);
    const resultado = await updatePlanPricesAction({ valorPro: pro, valorStudio: studio });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Preços atualizados — vale só para novas assinaturas.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preços dos planos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="valor-pro">Pro (R$/mês)</Label>
            <Input
              id="valor-pro"
              inputMode="decimal"
              value={valorPro}
              disabled={salvando}
              onChange={(e) => setValorPro(e.target.value)}
              className="max-w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valor-studio">Studio (R$/mês)</Label>
            <Input
              id="valor-studio"
              inputMode="decimal"
              value={valorStudio}
              disabled={salvando}
              onChange={(e) => setValorStudio(e.target.value)}
              className="max-w-32"
            />
          </div>
          <Button variant="outline" disabled={salvando} onClick={handleSalvar}>
            Salvar preços
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Só vale para novas assinaturas — quem já assinou mantém o valor combinado até cancelar. O
          plano Grátis não tem preço (é permanente).
        </p>
      </CardContent>
    </Card>
  );
}
