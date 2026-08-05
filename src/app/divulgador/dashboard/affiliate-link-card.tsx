"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AffiliateLinkCard({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Seu link de indicação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          <p className="flex-1 truncate text-sm text-muted-foreground">{link}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            aria-label="Copiar link de indicação"
          >
            {copiado ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cada profissional que criar a agenda por esse link fica vinculado a
          você — a comissão é recorrente enquanto a assinatura dele estiver
          ativa.
        </p>
      </CardContent>
    </Card>
  );
}
