"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { testMetaEventAction } from "./actions";

type Kind = "signup" | "subscribe" | "cancel";

const BOTOES: { kind: Kind; label: string; descricao: string }[] = [
  {
    kind: "signup",
    label: "Testar cadastro (CompleteRegistration + StartTrial)",
    descricao: "Simula alguém terminando o passo 2 do wizard em /criar-agenda.",
  },
  {
    kind: "subscribe",
    label: "Testar assinatura paga (Subscribe)",
    descricao: "Simula a primeira cobrança confirmada — o evento mais importante pro anúncio.",
  },
  {
    kind: "cancel",
    label: "Testar cancelamento (CancelSubscription)",
    descricao: "Só pra análise de funil — não afeta otimização de anúncio.",
  },
];

export function MetaAdsTestCard({ pronto, motivoBloqueio }: { pronto: boolean; motivoBloqueio: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testando, setTestando] = useState<Kind | null>(null);

  function handleTestar(kind: Kind) {
    setTestando(kind);
    startTransition(async () => {
      const resultado = await testMetaEventAction(kind);
      setTestando(null);
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      toast.success("Evento de teste enviado — confira no Events Manager (aba Testar eventos) ou na lista abaixo.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Testar eventos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Manda um evento de teste de verdade pra Conversions API (marcado com o Test Event Code, então
          nunca conta como conversão real pro anúncio) usando o seu e-mail/telefone de admin. Não precisa
          criar uma conta nova nem pagar uma assinatura pra conferir se a integração está funcionando.
        </p>

        {!pronto && motivoBloqueio ? (
          <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            {motivoBloqueio}
          </p>
        ) : null}

        <div className="space-y-2">
          {BOTOES.map((botao) => (
            <div
              key={botao.kind}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{botao.label}</p>
                <p className="text-xs text-muted-foreground">{botao.descricao}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!pronto || pending}
                onClick={() => handleTestar(botao.kind)}
              >
                {pending && testando === botao.kind ? "Enviando..." : "Testar"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
