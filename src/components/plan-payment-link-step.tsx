"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PlanPaymentLinkStep({
  link,
  telefone,
  onDone,
}: {
  link: string;
  telefone: string;
  onDone: () => void;
}) {
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
