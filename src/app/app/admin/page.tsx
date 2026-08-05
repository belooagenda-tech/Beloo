import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingSettingsCard } from "./billing-settings-card";
import { DivulgadoresCard, type DivulgadorRow } from "./divulgadores-card";
import { IndicacoesCard, type IndicacaoRow } from "./indicacoes-card";
import { ComissoesCard, type ComissaoRow } from "./comissoes-card";
import { normalizarPeriodo, resolvePeriodo } from "../(gated)/financeiro/period";
import type { SaasSubscriptionStatus } from "@/lib/supabase/types";

// Fuso fixo pro filtro de período do extrato de comissões — é um relatório
// administrativo único (não por-negócio, como em Financeiro), não faz
// sentido variar por timezone de loja.
const ADMIN_TIMEZONE = "America/Sao_Paulo";

export const metadata: Metadata = { title: "Admin" };

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ periodoComissoes?: string }>;
}) {
  const profile = await getOwnProfile();
  if (!profile?.is_admin) {
    redirect("/app");
  }

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("saas_plans")
    .select("billing_enabled, valor_mensal, billing_enabled_at, trial_dias")
    .limit(1)
    .maybeSingle();

  const [{ data: businesses }, { data: subscriptions }] = await Promise.all([
    admin
      .from("businesses")
      .select("id, nome_loja, slug, profile_id")
      .order("nome_loja", { ascending: true }),
    admin
      .from("saas_subscriptions")
      .select("business_id, status, trial_ends_at, current_period_end"),
  ]);

  const profileIds = [...new Set((businesses ?? []).map((b) => b.profile_id))];
  const { data: profiles } =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, email").in("id", profileIds)
      : { data: [] };

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const subByBusinessId = new Map((subscriptions ?? []).map((s) => [s.business_id, s]));

  const linhas = (businesses ?? []).map((business) => {
    const sub = subByBusinessId.get(business.id);
    return {
      id: business.id,
      nomeLoja: business.nome_loja,
      slug: business.slug,
      email: emailById.get(business.profile_id) ?? "—",
      status: sub?.status ?? "trial",
      trialEndsAt: sub?.trial_ends_at ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
    };
  });

  // ==========================================================================
  // Divulgadores — sistema de comissões via Stripe Connect.
  // ==========================================================================
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { data: divulgadoresRaw } = await admin
    .from("divulgadores")
    .select(
      "id, nome, email, codigo_afiliado, stripe_onboarding_completo, percentual_comissao, status, criado_em",
    )
    .order("criado_em", { ascending: false });

  const divulgadores: DivulgadorRow[] = (divulgadoresRaw ?? []).map((d) => ({
    id: d.id,
    nome: d.nome,
    email: d.email,
    codigoAfiliado: d.codigo_afiliado,
    stripeOnboardingCompleto: d.stripe_onboarding_completo,
    percentualComissao: d.percentual_comissao,
    status: d.status,
  }));
  const divulgadorNomeById = new Map(divulgadores.map((d) => [d.id, d.nome]));

  const { data: indicacoesRaw } = await admin
    .from("indicacoes")
    .select("id, divulgador_id, profissional_id, criado_em")
    .order("criado_em", { ascending: false });

  const indicacaoBusinessIds = [...new Set((indicacoesRaw ?? []).map((i) => i.profissional_id))];
  const [{ data: indicacaoBusinesses }, { data: indicacaoSubs }] = await Promise.all([
    indicacaoBusinessIds.length > 0
      ? admin.from("businesses").select("id, nome_loja").in("id", indicacaoBusinessIds)
      : Promise.resolve({ data: [] }),
    indicacaoBusinessIds.length > 0
      ? admin.from("saas_subscriptions").select("business_id, status").in("business_id", indicacaoBusinessIds)
      : Promise.resolve({ data: [] }),
  ]);
  const businessNomeById = new Map((indicacaoBusinesses ?? []).map((b) => [b.id, b.nome_loja]));
  const businessStatusById = new Map((indicacaoSubs ?? []).map((s) => [s.business_id, s.status]));

  const indicacoes: IndicacaoRow[] = (indicacoesRaw ?? []).map((i) => ({
    id: i.id,
    divulgadorNome: divulgadorNomeById.get(i.divulgador_id) ?? "Divulgador removido",
    profissionalNome: businessNomeById.get(i.profissional_id) ?? "Profissional removido",
    status: businessStatusById.get(i.profissional_id) ?? "trial",
    criadoEm: i.criado_em,
  }));

  const { periodoComissoes: periodoComissoesParam } = await searchParams;
  const periodoComissoes = normalizarPeriodo(periodoComissoesParam);
  const { de: deComissoes, ate: ateComissoes } = resolvePeriodo(periodoComissoes, ADMIN_TIMEZONE);

  const { data: comissoesRaw } = await admin
    .from("comissoes_registro")
    .select("id, divulgador_id, profissional_id, valor_comissao, status, criado_em")
    .gte("criado_em", deComissoes.toISOString())
    .lte("criado_em", ateComissoes.toISOString())
    .order("criado_em", { ascending: false });

  const comissaoBusinessIds = [...new Set((comissoesRaw ?? []).map((c) => c.profissional_id))];
  const { data: comissaoBusinesses } =
    comissaoBusinessIds.length > 0
      ? await admin.from("businesses").select("id, nome_loja").in("id", comissaoBusinessIds)
      : { data: [] };
  const comissaoBusinessNomeById = new Map((comissaoBusinesses ?? []).map((b) => [b.id, b.nome_loja]));

  const comissoes: ComissaoRow[] = (comissoesRaw ?? []).map((c) => ({
    id: c.id,
    divulgadorNome: divulgadorNomeById.get(c.divulgador_id) ?? "Divulgador removido",
    profissionalNome: comissaoBusinessNomeById.get(c.profissional_id) ?? "Profissional removido",
    valorComissao: c.valor_comissao,
    status: c.status,
    criadoEm: c.criado_em,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle a cobrança da Beloo e acompanhe as assinaturas dos profissionais.
        </p>
      </div>

      <BillingSettingsCard
        initialEnabled={plan?.billing_enabled ?? false}
        initialValorMensal={plan?.valor_mensal ?? 49.9}
        billingEnabledAt={plan?.billing_enabled_at ?? null}
        trialDias={plan?.trial_dias ?? 7}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissionais ({linhas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum profissional cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Loja</th>
                    <th className="py-2 pr-3 font-medium">E-mail</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Trial até</th>
                    <th className="py-2 pr-3 font-medium">Próxima cobrança</th>
                    <th className="py-2 font-medium">Link público</th>
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
                      <td className="py-2 pr-3 text-muted-foreground">
                        {formatarData(linha.trialEndsAt)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {formatarData(linha.currentPeriodEnd)}
                      </td>
                      <td className="py-2">
                        <a
                          href={`${siteUrl}/${linha.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          /{linha.slug}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DivulgadoresCard divulgadores={divulgadores} cadastroUrl={`${siteUrl}/divulgador/cadastro`} />
      <IndicacoesCard indicacoes={indicacoes} />
      <ComissoesCard comissoes={comissoes} periodo={periodoComissoes} />
    </div>
  );
}
