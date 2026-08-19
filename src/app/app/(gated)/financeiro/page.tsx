import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { normalizarPeriodo, resolvePeriodo } from "./period";
import { aggregateByFormaPagamento, aggregateByProfissional, aggregateByService, bucketByPeriod } from "./aggregate";
import { PeriodFilter } from "./period-filter";
import { ProfessionalFilter } from "./professional-filter";
import { ExpiringPlans } from "./expiring-plans";
import { ExportCsvButton } from "./export-csv-button";
import { PrintReportButton } from "./print-report-button";
import { MonthlyRevenueCard } from "./monthly-revenue-card";

// recharts é uma dependência pesada — carregar sob demanda mantém o bundle
// inicial das outras rotas de /app livre desse peso.
const RevenueByPeriodChart = dynamic(() =>
  import("./charts/revenue-by-period-chart").then((mod) => mod.RevenueByPeriodChart),
);
const RevenueByServiceChart = dynamic(() =>
  import("./charts/revenue-by-service-chart").then((mod) => mod.RevenueByServiceChart),
);
const RevenueByPaymentMethodChart = dynamic(() =>
  import("./charts/revenue-by-payment-method-chart").then((mod) => mod.RevenueByPaymentMethodChart),
);
const RevenueByProfessionalChart = dynamic(() =>
  import("./charts/revenue-by-professional-chart").then((mod) => mod.RevenueByProfessionalChart),
);
import { Card, CardContent } from "@/components/ui/card";
import type { ExpiringPlan, FinancePayment } from "./types";

export const metadata: Metadata = { title: "Financeiro" };

// service_id/professional_id do agendamento vêm embutidos na query de
// appointment_payments (relação N:1 — appointment_payments.appointment_id
// sempre aponta pra um único appointments) em vez de uma segunda ida ao
// banco por id. Cast explícito pelo mesmo motivo do embed em
// app/(gated)/agenda/page.tsx: os tipos do Database são mantidos à mão e não
// modelam relacionamentos.
type PaymentEmbedRow = FinancePayment & {
  appointments: { service_id: string; professional_id: string | null } | null;
};

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function localDateAddDays(dateStr: string, dias: number) {
  const [ano, mes, dia] = dateStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "yyyy-MM" do mês anterior ao informado.
function mesAnterior(anoMes: string): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  const data = new Date(ano, mes - 1 - 1, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; profissional?: string }>;
}) {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { periodo: periodoParam, profissional: profissionalParam } = await searchParams;
  const periodo = normalizarPeriodo(periodoParam);
  const { de, ate, ateStr } = resolvePeriodo(periodo, business!.timezone);

  // Faturamento do mês atual x mês anterior — sempre pelo calendário (mês
  // civil), independente do filtro de período escolhido acima (que pode
  // estar em "7 dias" ou "90 dias"). Uma query só cobrindo os dois meses,
  // separados em memória pela data de pagamento.
  const hojeStr = formatInTimeZone(new Date(), business!.timezone, "yyyy-MM-dd");
  const anoMesAtual = hojeStr.slice(0, 7);
  const inicioMesAtual = fromZonedTime(`${anoMesAtual}-01T00:00:00`, business!.timezone);
  const inicioMesAnterior = fromZonedTime(`${mesAnterior(anoMesAtual)}-01T00:00:00`, business!.timezone);

  const [{ data: paymentsRaw }, { data: services }, { data: activeSubs }, { data: paymentsComparacao }] =
    await Promise.all([
      supabase
        .from("appointment_payments")
        .select("appointment_id, valor, forma_pagamento, origem, pago_em, appointments(service_id, professional_id)")
        .gte("pago_em", de.toISOString())
        .lte("pago_em", ate.toISOString()),
      supabase.from("services").select("id, nome").eq("business_id", business!.id),
      supabase.from("client_plan_subs").select("id, client_id, plan_id, data_renovacao").eq("ativo", true),
      supabase
        .from("appointment_payments")
        .select("valor, pago_em")
        .gte("pago_em", inicioMesAnterior.toISOString())
        .lte("pago_em", new Date().toISOString()),
    ]);

  let totalMesAtual = 0;
  let totalMesAnterior = 0;
  for (const p of paymentsComparacao ?? []) {
    if (new Date(p.pago_em) >= inicioMesAtual) totalMesAtual += p.valor;
    else totalMesAnterior += p.valor;
  }

  const paymentEmbedRows = (paymentsRaw ?? []) as unknown as PaymentEmbedRow[];
  const paymentsTyped: FinancePayment[] = paymentEmbedRows.map((p) => ({
    appointment_id: p.appointment_id,
    valor: p.valor,
    forma_pagamento: p.forma_pagamento,
    origem: p.origem,
    pago_em: p.pago_em,
  }));
  const appointmentServiceMap = new Map<string, string>();
  const appointmentProfessionalMap = new Map<string, string>();
  for (const row of paymentEmbedRows) {
    if (!row.appointments) continue;
    appointmentServiceMap.set(row.appointment_id, row.appointments.service_id);
    if (row.appointments.professional_id) {
      appointmentProfessionalMap.set(row.appointment_id, row.appointments.professional_id);
    }
  }
  const servicesById = new Map((services ?? []).map((s) => [s.id, s.nome]));

  // Vazio numa loja que não usa a aba Equipe — os cards/gráfico de
  // profissional simplesmente não aparecem (ver renderização abaixo).
  const { data: professionals } = await supabase
    .from("professionals")
    .select("id, nome")
    .eq("business_id", business!.id);
  const professionalsById = new Map((professionals ?? []).map((p) => [p.id, p.nome]));

  // Filtro opcional por profissional (?profissional=<id>) — mesmo padrão de
  // searchParam do PeriodFilter, afeta todos os cards/gráficos/CSV abaixo de
  // uma vez só. Só é válido se corresponder a um profissional real da loja;
  // um id qualquer na URL simplesmente cai pra "todos".
  const professionalIdFiltro =
    profissionalParam && (professionals ?? []).some((p) => p.id === profissionalParam)
      ? profissionalParam
      : null;
  const paymentsFiltrados = professionalIdFiltro
    ? paymentsTyped.filter((p) => appointmentProfessionalMap.get(p.appointment_id) === professionalIdFiltro)
    : paymentsTyped;

  const byPeriod = bucketByPeriod(paymentsFiltrados, de, ate, business!.timezone);
  const byService = aggregateByService(paymentsFiltrados, appointmentServiceMap, servicesById);
  const byFormaPagamento = aggregateByFormaPagamento(paymentsFiltrados);
  const byProfissional = aggregateByProfissional(paymentsFiltrados, appointmentProfessionalMap, professionalsById);

  // Produtos vendidos junto de agendamentos já pagos no período (mesmo
  // recorte de paymentsFiltrados) — não é um chart novo, só mais um número
  // no resumo, pra não pesar a página com mais uma query pesada/gráfico.
  const paymentAppointmentIds = [...new Set(paymentsFiltrados.map((p) => p.appointment_id))];
  const { data: produtosVendidosRaw } =
    paymentAppointmentIds.length > 0
      ? await supabase
          .from("appointment_products")
          .select("preco_snapshot, quantidade")
          .in("appointment_id", paymentAppointmentIds)
      : { data: [] };
  const totalProdutos = (produtosVendidosRaw ?? []).reduce(
    (acc, p) => acc + p.preco_snapshot * p.quantidade,
    0,
  );
  const itensProdutos = (produtosVendidosRaw ?? []).reduce((acc, p) => acc + p.quantidade, 0);

  const totalAvulso = paymentsFiltrados
    .filter((p) => p.origem === "avulso")
    .reduce((acc, p) => acc + p.valor, 0);
  const totalPlanoReferencia = paymentsFiltrados
    .filter((p) => p.origem === "plano")
    .reduce((acc, p) => acc + p.valor, 0);

  const planIds = [...new Set((activeSubs ?? []).map((s) => s.plan_id))];
  const { data: plans } =
    planIds.length > 0
      ? await supabase.from("client_plans").select("id, nome, valor_mensal").in("id", planIds)
      : { data: [] };
  const planoById = new Map((plans ?? []).map((p) => [p.id, p]));
  const mrr = (activeSubs ?? []).reduce((acc, sub) => acc + (planoById.get(sub.plan_id)?.valor_mensal ?? 0), 0);

  const limiteVencimento = localDateAddDays(ateStr, 7);
  const subsVencendo = (activeSubs ?? []).filter((s) => s.data_renovacao <= limiteVencimento);
  const clientIds = [...new Set(subsVencendo.map((s) => s.client_id))];
  const { data: clientesVencendo } =
    clientIds.length > 0
      ? await supabase.from("clients").select("id, nome, telefone").in("id", clientIds)
      : { data: [] };
  const clienteById = new Map((clientesVencendo ?? []).map((c) => [c.id, c]));

  const expiringPlans: ExpiringPlan[] = subsVencendo
    .map((sub) => ({
      subId: sub.id,
      clientId: sub.client_id,
      clientNome: clienteById.get(sub.client_id)?.nome ?? "Cliente",
      clientTelefone: clienteById.get(sub.client_id)?.telefone ?? "",
      planNome: planoById.get(sub.plan_id)?.nome ?? "Plano removido",
      dataRenovacao: sub.data_renovacao,
    }))
    .sort((a, b) => a.dataRenovacao.localeCompare(b.dataRenovacao));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faturamento avulso e o retorno estimado dos seus planos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <ExportCsvButton
            periodo={periodo}
            byPeriod={byPeriod}
            byService={byService}
            byFormaPagamento={byFormaPagamento}
            byProfissional={byProfissional}
          />
          <PrintReportButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <PeriodFilter periodo={periodo} />
        {professionals && professionals.length > 0 ? (
          <ProfessionalFilter
            periodo={periodo}
            professionalId={professionalIdFiltro}
            professionals={professionals}
          />
        ) : null}
      </div>

      <MonthlyRevenueCard
        businessId={business!.id}
        totalMesAtual={totalMesAtual}
        totalMesAnterior={totalMesAnterior}
        metaInicial={business!.meta_faturamento_mensal}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(totalAvulso)}</p>
            <p className="text-xs text-muted-foreground">Faturamento avulso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(totalPlanoReferencia)}</p>
            <p className="text-xs text-muted-foreground">Valor gerado por planos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(totalProdutos)}</p>
            <p className="text-xs text-muted-foreground">
              Produtos vendidos{itensProdutos > 0 ? ` (${itensProdutos} itens)` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{formatarPreco(mrr)}</p>
            <p className="text-xs text-muted-foreground">MRR (planos ativos)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{expiringPlans.length}</p>
            <p className="text-xs text-muted-foreground">Planos vencendo em 7 dias</p>
          </CardContent>
        </Card>
      </div>

      <RevenueByPeriodChart data={byPeriod} />
      <RevenueByServiceChart data={byService} />
      <RevenueByPaymentMethodChart data={byFormaPagamento} />
      {professionals && professionals.length > 0 ? <RevenueByProfessionalChart data={byProfissional} /> : null}
      <ExpiringPlans plans={expiringPlans} nomeLoja={business!.nome_loja} />
    </div>
  );
}
