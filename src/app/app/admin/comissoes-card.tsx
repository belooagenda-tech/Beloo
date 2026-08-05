import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComissoesPeriodFilter } from "./comissoes-period-filter";

export type ComissaoRow = {
  id: string;
  divulgadorNome: string;
  profissionalNome: string;
  valorComissao: number;
  status: "confirmado" | "falhou";
  criadoEm: string;
};

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ComissoesCard({ comissoes, periodo }: { comissoes: ComissaoRow[]; periodo: string }) {
  const total = comissoes
    .filter((c) => c.status === "confirmado")
    .reduce((acc, c) => acc + c.valorComissao, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Extrato de comissões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ComissoesPeriodFilter periodo={periodo} />
        <p className="text-sm text-muted-foreground">
          Total no período: <span className="font-semibold text-foreground">{formatarPreco(total)}</span>
        </p>
        {comissoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma comissão nesse período.
          </p>
        ) : (
          <ul>
            {comissoes.map((comissao) => (
              <li
                key={comissao.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {comissao.divulgadorNome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {comissao.profissionalNome} · {formatarData(comissao.criadoEm)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatarPreco(comissao.valorComissao)}
                  </p>
                  {comissao.status === "falhou" ? (
                    <Badge variant="destructive">Falhou</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
