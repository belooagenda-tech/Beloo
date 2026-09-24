import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildOutreachMessage, buildWhatsAppLink, type StatusUsoProfissional } from "@/lib/whatsapp";
import { EditPlanTierDialog } from "./edit-plan-tier-dialog";
import { PLAN_LABELS } from "@/lib/plan/features";
import type { PlanTier } from "@/lib/supabase/types";

export type ProfessionalRow = {
  id: string;
  nomeLoja: string;
  slug: string;
  email: string;
  telefone: string | null;
  statusUso: StatusUsoProfissional;
  planTier: PlanTier;
};

const PLAN_TIER_CLASS: Record<PlanTier, string> = {
  gratis: "bg-muted text-muted-foreground",
  pro: "bg-primary/15 text-primary",
  studio: "bg-success/15 text-success",
};

const STATUS_USO_META: Record<StatusUsoProfissional, { label: string; className: string }> = {
  sem_configuracao: { label: "Sem configuração", className: "bg-destructive/10 text-destructive" },
  configurado_sem_uso: { label: "Configurado, sem uso", className: "bg-warning/15 text-warning" },
  ativo: { label: "Ativo", className: "bg-success/15 text-success" },
};

// Continua sendo um Server Component — a única parte interativa (editar o
// plano) é o EditPlanTierDialog, um Client Component filho; não precisa
// "use client" aqui só pra desenhar a tabela.
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
            <th className="py-2 pr-3 font-medium">Uso</th>
            <th className="py-2 pr-3 font-medium">Plano</th>
            <th className="py-2 pr-3 font-medium">Link público</th>
            <th className="py-2 pr-3 font-medium" />
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 font-medium text-foreground">{linha.nomeLoja}</td>
              <td className="py-2 pr-3 text-muted-foreground">{linha.email}</td>
              <td className="py-2 pr-3">
                <Badge variant="secondary" className={STATUS_USO_META[linha.statusUso].className}>
                  {STATUS_USO_META[linha.statusUso].label}
                </Badge>
              </td>
              <td className="py-2 pr-3">
                <Badge variant="secondary" className={PLAN_TIER_CLASS[linha.planTier]}>
                  {PLAN_LABELS[linha.planTier]}
                </Badge>
              </td>
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
              <td className="py-2 pr-3">
                {linha.telefone ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Chamar ${linha.nomeLoja} no WhatsApp`}
                    nativeButton={false}
                    render={
                      <a
                        href={buildWhatsAppLink(
                          linha.telefone,
                          buildOutreachMessage(linha.statusUso, linha.nomeLoja),
                        )}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <MessageCircle className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    aria-label="Sem telefone cadastrado"
                    title="Sem telefone cadastrado"
                  >
                    <MessageCircle className="size-3.5" />
                  </Button>
                )}
              </td>
              <td className="py-2">
                <EditPlanTierDialog row={linha} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
