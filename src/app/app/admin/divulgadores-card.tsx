"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDivulgadorComissaoAction, toggleDivulgadorStatusAction } from "./actions";
import type { DivulgadorStatus } from "@/lib/supabase/types";

export type DivulgadorRow = {
  id: string;
  nome: string;
  email: string;
  codigoAfiliado: string;
  stripeOnboardingCompleto: boolean;
  percentualComissao: number;
  status: DivulgadorStatus;
};

function LinhaDivulgador({ divulgador }: { divulgador: DivulgadorRow }) {
  const [percentual, setPercentual] = useState(String(divulgador.percentualComissao));
  const [salvando, setSalvando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [status, setStatus] = useState(divulgador.status);

  async function handleSalvarPercentual() {
    const valor = Number(percentual.replace(",", "."));
    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Informe um percentual entre 0 e 100.");
      return;
    }
    setSalvando(true);
    const resultado = await updateDivulgadorComissaoAction({
      divulgadorId: divulgador.id,
      percentualComissao: valor,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Comissão atualizada.");
  }

  async function handleAlternarStatus() {
    const novoStatus = status === "ativo" ? "inativo" : "ativo";
    setAlternando(true);
    const resultado = await toggleDivulgadorStatusAction({
      divulgadorId: divulgador.id,
      status: novoStatus,
    });
    setAlternando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setStatus(novoStatus);
    toast.success(novoStatus === "ativo" ? "Divulgador reativado." : "Divulgador desativado.");
  }

  return (
    <li className="space-y-2 border-b border-border py-3 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{divulgador.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {divulgador.email} · {divulgador.codigoAfiliado}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {divulgador.stripeOnboardingCompleto ? (
            <Badge className="bg-success/15 text-success" variant="secondary">
              Onboarding ok
            </Badge>
          ) : (
            <Badge className="bg-warning/15 text-warning" variant="secondary">
              Onboarding pendente
            </Badge>
          )}
          {status === "inativo" ? <Badge variant="secondary">Inativo</Badge> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            inputMode="decimal"
            className="h-8 w-20"
            disabled={salvando}
          />
          <span className="text-sm text-muted-foreground">% comissão</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleSalvarPercentual} disabled={salvando}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleAlternarStatus} disabled={alternando}>
          {status === "ativo" ? "Desativar" : "Reativar"}
        </Button>
      </div>
    </li>
  );
}

export function DivulgadoresCard({
  divulgadores,
  cadastroUrl,
}: {
  divulgadores: DivulgadorRow[];
  cadastroUrl: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiarLink() {
    await navigator.clipboard.writeText(cadastroUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Divulgadores ({divulgadores.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={handleCopiarLink}>
          {copiado ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          Link de cadastro
        </Button>
      </CardHeader>
      <CardContent>
        {divulgadores.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum divulgador cadastrado ainda.
          </p>
        ) : (
          <ul>
            {divulgadores.map((divulgador) => (
              <LinhaDivulgador key={divulgador.id} divulgador={divulgador} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
