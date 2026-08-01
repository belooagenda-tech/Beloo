import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { normalizarPeriodo, resolvePeriodo } from "./period";
import { aggregateByFormaPagamento, aggregateByService, bucketByPeriod } from "./aggregate";
import { PeriodFilter } from "./period-filter";
import { RevenueByPeriodChart } from "./charts/revenue-by-period-chart";
import { RevenueByServiceChart } from "./charts/revenue-by-service-chart";
import { RevenueByPaymentMethodChart } from "./charts/revenue-by-payment-method-chart";
import { ExpiringPlans } from "./expiring-plans";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpiringPlan, FinancePayment } from "./types";

export const metadata: Metadata = { title: "Financeiro" };

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

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("profile_id", user!.id)
    .single();

  const { periodo: periodoParam } = await searchParams;
  const periodo = normalizarPeriodo(periodoParam);
  const { de, ate, ateStr } = resolvePeriodo(periodo, business!.timezone);

  const [{ data: payments }, { data: services }, { data: activeSubs }] = await Promise.all([
    supabase
      .from("appointment_payments")
      .select("appointment_id, valor, forma_pagamento, origem, pago_em")
      .gte("pago_em", de.toISOString())
      .lte("pago_em", ate.toISOString()),
    supabase.from("services").select("id, nome").eq("business_id", business!.id),
    supabase.from("client_plan_subs").select("id, client_id, plan_id, data_renovacao").eq("ativo", true),
  ]);

  const paymentsTyped = (payments ?? []) as FinancePayment[];
  const appointmentIds = paymentsTyped.map((p) => p.appointment_id);
  const { data: appointments } =
    appointmentIds.length > 0
      ? await supabase.from("appointments").select("id, service_id").in("id", appointmentIds)
      : { data: [] };

  const appointmentServiceMap = new Map((appointments ?? []).map((a) => [a.id, a.service_id]));
  const servicesById = new Map((services ?? []).map((s) => [s.id, s.nome]));

  const byPeriod = bucketByPeriod(paymentsTyped, de, ate, business!.timezone);
  const byService = aggregateByService(paymentsTyped, appointmentServiceMap, servicesById);
  const byFormaPagamento = aggregateByFormaPagamento(paymentsTyped);

  const totalAvulso = paymentsTyped
    .filter((p) => p.origem === "avulso")
    .reduce((acc, p) => acc + p.valor, 0);
  const totalPlanoReferencia = paymentsTyped
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
      ? await supabase.from("clients").select("id, nome").in("id", clientIds)
      : { data: [] };
  const clienteNomeById = new Map((clientesVencendo ?? []).map((c) => [c.id, c.nome]));

  const expiringPlans: ExpiringPlan[] = subsVencendo
    .map((sub) => ({
      subId: sub.id,
      clientId: sub.client_id,
      clientNome: clienteNomeById.get(sub.client_id) ?? "Cliente",
      planNome: planoById.get(sub.plan_id)?.nome ?? "Plano removido",
      dataRenovacao: sub.data_renovacao,
    }))
    .sort((a, b) => a.dataRenovacao.localeCompare(b.dataRenovacao));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faturamento avulso e o retorno estimado dos seus planos.
        </p>
      </div>

      <PeriodFilter periodo={periodo} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <ExpiringPlans plans={expiringPlans} />
    </div>
  );
}
