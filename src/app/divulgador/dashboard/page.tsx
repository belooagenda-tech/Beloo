import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionDivulgador } from "@/lib/divulgador/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OnboardingPendingAlert } from "./onboarding-pending-alert";
import { AffiliateLinkCard } from "./affiliate-link-card";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Painel do divulgador" };

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<SaasSubscriptionStatus, { label: string; className: string }> = {
  trial: { label: "Em teste", className: "bg-muted text-muted-foreground" },
  ativo: { label: "Ativo", className: "bg-success/15 text-success" },
  atrasado: { label: "Pagamento atrasado", className: "bg-warning/15 text-warning" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

export default async function DivulgadorDashboardPage() {
  // O layout já garante que existe sessão — sabemos que não é null aqui.
  const divulgador = (await getSessionDivulgador())!;
  const admin = createAdminClient();

  const { data: indicacoes } = await admin
    .from("indicacoes")
    .select("profissional_id, criado_em")
    .eq("divulgador_id", divulgador.id)
    .order("criado_em", { ascending: false });

  const businessIds = (indicacoes ?? []).map((i) => i.profissional_id);
  const [{ data: businesses }, { data: subs }, { data: comissoes }] = await Promise.all([
    businessIds.length > 0
      ? admin.from("businesses").select("id, nome_loja").in("id", businessIds)
      : Promise.resolve({ data: [] }),
    businessIds.length > 0
      ? admin.from("saas_subscriptions").select("business_id, status").in("business_id", businessIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("comissoes_registro")
      .select("id, profissional_id, valor_comissao, status, criado_em")
      .eq("divulgador_id", divulgador.id)
      .order("criado_em", { ascending: false }),
  ]);

  const nomeById = new Map((businesses ?? []).map((b) => [b.id, b.nome_loja]));
  const statusById = new Map((subs ?? []).map((s) => [s.business_id, s.status]));

  const indicados = (indicacoes ?? []).map((i) => ({
    profissionalId: i.profissional_id,
    nome: nomeById.get(i.profissional_id) ?? "Profissional",
    status: statusById.get(i.profissional_id) ?? "trial",
    criadoEm: i.criado_em,
  }));

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const comissoesConfirmadas = (comissoes ?? []).filter((c) => c.status === "confirmado");
  const comissaoDoMes = comissoesConfirmadas
    .filter((c) => new Date(c.criado_em) >= inicioMes)
    .reduce((acc, c) => acc + c.valor_comissao, 0);
  const comissaoTotal = comissoesConfirmadas.reduce((acc, c) => acc + c.valor_comissao, 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const linkAfiliado = `${siteUrl}/criar-agenda?ref=${divulgador.codigo_afiliado}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Olá, {divulgador.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua comissão é recorrente: você continua recebendo todo mês enquanto
          a assinatura do profissional indicado estiver ativa.
        </p>
      </div>

      {!divulgador.stripe_onboarding_completo ? <OnboardingPendingAlert /> : null}

      <AffiliateLinkCard link={linkAfiliado} />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(comissaoDoMes)}</p>
            <p className="text-xs text-muted-foreground">Comissão neste mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(comissaoTotal)}</p>
            <p className="text-xs text-muted-foreground">Comissão total recebida</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissionais indicados ({indicados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {indicados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ninguém se cadastrou pelo seu link ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {indicados.map((indicado) => {
                const status = STATUS_LABEL[indicado.status as SaasSubscriptionStatus];
                return (
                  <li
                    key={indicado.profissionalId}
                    className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{indicado.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Indicado em {formatarData(indicado.criadoEm)}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {(comissoes ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma comissão registrada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {(comissoes ?? []).map((comissao) => (
                <li
                  key={comissao.id}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {nomeById.get(comissao.profissional_id) ?? "Profissional"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatarData(comissao.criado_em)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatarPreco(comissao.valor_comissao)}
                    </p>
                    {comissao.status === "falhou" ? (
                      <p className="text-xs text-destructive">Falhou</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
