import { Badge } from "@/components/ui/badge";
import { EditSubscriptionDialog } from "./edit-subscription-dialog";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

export type ProfessionalRow = {
  id: string;
  nomeLoja: string;
  slug: string;
  email: string;
  status: SaasSubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const STATUS_LABEL: Record<SaasSubscriptionStatus, string> = {
  trial: "Teste grátis",
  ativo: "Ativo",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Continua sendo um Server Component — a única parte interativa (editar
// vencimento) é o EditSubscriptionDialog, um Client Component filho; não
// precisa "use client" aqui só pra desenhar a tabela.
export function ProfessionalsTable({
  linhas,
  siteUrl,
}: {
  linhas: ProfessionalRow[];
  siteUrl: string;
}) {
  if (linhas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum profissional cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Loja</th>
            <th className="py-2 pr-3 font-medium">E-mail</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Trial até</th>
            <th className="py-2 pr-3 font-medium">Próxima cobrança</th>
            <th className="py-2 pr-3 font-medium">Link público</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 font-medium text-foreground">{linha.nomeLoja}</td>
              <td className="py-2 pr-3 text-muted-foreground">{linha.email}</td>
              <td className="py-2 pr-3">
                <Badge variant={linha.status === "ativo" ? "secondary" : "outline"}>
                  {STATUS_LABEL[linha.status]}
                </Badge>
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{formatarData(linha.trialEndsAt)}</td>
              <td className="py-2 pr-3 text-muted-foreground">{formatarData(linha.currentPeriodEnd)}</td>
              <td className="py-2 pr-3">
                <a
                  href={`${siteUrl}/${linha.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  /{linha.slug}
                </a>
              </td>
              <td className="py-2">
                <EditSubscriptionDialog row={linha} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
