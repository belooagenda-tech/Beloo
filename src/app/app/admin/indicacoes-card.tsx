import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

export type IndicacaoRow = {
  id: string;
  divulgadorNome: string;
  profissionalNome: string;
  status: SaasSubscriptionStatus;
  criadoEm: string;
};

const STATUS_LABEL: Record<SaasSubscriptionStatus, { label: string; className: string }> = {
  trial: { label: "Em teste", className: "bg-muted text-muted-foreground" },
  ativo: { label: "Ativo", className: "bg-success/15 text-success" },
  atrasado: { label: "Atrasado", className: "bg-warning/15 text-warning" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function IndicacoesCard({ indicacoes }: { indicacoes: IndicacaoRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Indicações ({indicacoes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {indicacoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma indicação registrada ainda.
          </p>
        ) : (
          <ul>
            {indicacoes.map((indicacao) => {
              const status = STATUS_LABEL[indicacao.status];
              return (
                <li
                  key={indicacao.id}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {indicacao.profissionalNome}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      indicado por {indicacao.divulgadorNome} · {formatarData(indicacao.criadoEm)}
                    </p>
                  </div>
                  <Badge className={status.className} variant="secondary">
                    {status.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
