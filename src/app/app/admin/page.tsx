import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnProfile } from "@/lib/supabase/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingSettingsCard } from "./billing-settings-card";
import { ProfessionalsTable } from "./professionals-table";
import { DivulgadoresCard, type DivulgadorRow } from "./divulgadores-card";
import { IndicacoesCard, type IndicacaoRow } from "./indicacoes-card";
import { ComissoesCard, type ComissaoRow } from "./comissoes-card";
import { normalizarPeriodo, resolvePeriodo } from "../(gated)/financeiro/period";

// Fuso fixo pro filtro de período do extrato de comissões — é um relatório
// administrativo único (não por-negócio, como em Financeiro), não faz
// sentido variar por timezone de loja.
const ADMIN_TIMEZONE = "America/Sao_Paulo";

export const metadata: Metadata = { title: "Admin" };

const PROFISSIONAIS_PAGE_SIZE = 50;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ periodoComissoes?: string; pagina?: string }>;
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

  const { pagina: paginaParam } = await searchParams;
  // Lista de profissionais paginada — sem isso, a página fica cada vez mais
  // pesada conforme a base cresce (achado 🟡 da auditoria de 2026-08-07:
  // essa era a única listagem "de negócio" sem paginação no produto).
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const inicio = (pagina - 1) * PROFISSIONAIS_PAGE_SIZE;
  const fim = inicio + PROFISSIONAIS_PAGE_SIZE - 1;

  const [{ data: businesses, count: totalBusinesses }, { data: subscriptions }] = await Promise.all([
    admin
      .from("businesses")
      .select("id, nome_loja, slug, profile_id", { count: "exact" })
      .order("nome_loja", { ascending: true })
      .range(inicio, fim),
    admin
      .from("saas_subscriptions")
      .select("business_id, status, trial_ends_at, current_period_end"),
  ]);

  const totalPaginas = Math.max(1, Math.ceil((totalBusinesses ?? 0) / PROFISSIONAIS_PAGE_SIZE));

  const profileIds = [...new Set((businesses ?? []).map((b) => b.profile_id))];
  const { data: profiles } =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, telefone, email").in("id", profileIds)
      : { data: [] };

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const telefoneById = new Map((profiles ?? []).map((p) => [p.id, p.telefone]));
  const subByBusinessId = new Map((subscriptions ?? []).map((s) => [s.business_id, s]));

  // Status de uso — decide qual mensagem de WhatsApp oferecer (ver
  // buildOutreachMessage em src/lib/whatsapp.ts): sem nenhum serviço
  // cadastrado, com serviço mas nunca recebeu agendamento, ou já ativo.
  // Escopado às lojas desta página (mesmo padrão de profileIds acima).
  const pageBusinessIds = (businesses ?? []).map((b) => b.id);
  const { data: servicesRaw } =
    pageBusinessIds.length > 0
      ? await admin.from("services").select("business_id").eq("ativo", true).in("business_id", pageBusinessIds)
      : { data: [] };
  const businessesComServico = new Set((servicesRaw ?? []).map((s) => s.business_id));

  // Existência de agendamento (não a contagem) é o que importa aqui — 1
  // query pequena por loja (`head: true`, sem baixar linha nenhuma) em vez
  // de uma query só com um LIMIT compartilhado entre todas as lojas da
  // página, que arriscaria uma loja com muitos agendamentos "engolir" o
  // limite e esconder agendamentos de outra loja da mesma página.
  const contagens = await Promise.all(
    pageBusinessIds.map((id) =>
      admin.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", id),
    ),
  );
  const businessesComAgendamento = new Set(
    pageBusinessIds.filter((_, index) => (contagens[index].count ?? 0) > 0),
  );

  const linhas = (businesses ?? []).map((business) => {
    const sub = subByBusinessId.get(business.id);
    const statusUso: "sem_configuracao" | "configurado_sem_uso" | "ativo" = businessesComAgendamento.has(
      business.id,
    )
      ? "ativo"
      : businessesComServico.has(business.id)
        ? "configurado_sem_uso"
        : "sem_configuracao";
    return {
      id: business.id,
      nomeLoja: business.nome_loja,
      slug: business.slug,
      email: emailById.get(business.profile_id) ?? "—",
      telefone: telefoneById.get(business.profile_id) ?? null,
      statusUso,
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

  const { count: logsNaoResolvidos } = await admin
    .from("error_logs")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false);

  const { count: mensagensNaoLidas } = await admin
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("lida", false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle a cobrança da Beloo e acompanhe as assinaturas dos profissionais.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/app/admin/suporte"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Suporte
            {mensagensNaoLidas ? (
              <Badge className="bg-primary/15 text-primary" variant="secondary">
                {mensagensNaoLidas}
              </Badge>
            ) : null}
          </Link>
          <Link
            href="/app/admin/anuncios"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Anúncios
          </Link>
          <Link
            href="/app/admin/logs"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Logs
            {logsNaoResolvidos ? (
              <Badge className="bg-destructive/15 text-destructive" variant="secondary">
                {logsNaoResolvidos}
              </Badge>
            ) : null}
          </Link>
        </div>
      </div>

      <BillingSettingsCard
        initialEnabled={plan?.billing_enabled ?? false}
        initialValorMensal={plan?.valor_mensal ?? 49.9}
        billingEnabledAt={plan?.billing_enabled_at ?? null}
        trialDias={plan?.trial_dias ?? 7}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissionais ({totalBusinesses ?? linhas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfessionalsTable linhas={linhas} siteUrl={siteUrl} />
          {totalPaginas > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/app/admin?pagina=${pagina - 1}`}
                  aria-disabled={pagina <= 1}
                  className={`rounded-md border border-border px-3 py-1.5 ${
                    pagina <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent"
                  }`}
                >
                  Anterior
                </Link>
                <Link
                  href={`/app/admin?pagina=${pagina + 1}`}
                  aria-disabled={pagina >= totalPaginas}
                  className={`rounded-md border border-border px-3 py-1.5 ${
                    pagina >= totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-accent"
                  }`}
                >
                  Próxima
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DivulgadoresCard divulgadores={divulgadores} cadastroUrl={`${siteUrl}/divulgador/cadastro`} />
      <IndicacoesCard indicacoes={indicacoes} />
      <ComissoesCard comissoes={comissoes} periodo={periodoComissoes} />
    </div>
  );
}
