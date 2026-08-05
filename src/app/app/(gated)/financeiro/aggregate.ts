import { formatInTimeZone } from "date-fns-tz";
import { differenceInCalendarDays, startOfWeek } from "date-fns";
import type { FormaPagamento } from "@/lib/supabase/types";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/payments/forma-pagamento";
import type { FinancePayment, PaymentMethodRevenue, PeriodBucket, ServiceRevenue } from "./types";

export function bucketByPeriod(
  payments: FinancePayment[],
  de: Date,
  ate: Date,
  timezone: string,
): PeriodBucket[] {
  const dias = differenceInCalendarDays(ate, de);
  const porSemana = dias > 31;
  const buckets = new Map<string, PeriodBucket>();

  for (const payment of payments) {
    const dataPagamento = new Date(payment.pago_em);
    let chave: string;
    let rotulo: string;

    if (porSemana) {
      const inicioSemana = startOfWeek(
        new Date(formatInTimeZone(dataPagamento, timezone, "yyyy-MM-dd'T'00:00:00")),
        { weekStartsOn: 1 },
      );
      chave = formatInTimeZone(inicioSemana, timezone, "yyyy-MM-dd");
      rotulo = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
        inicioSemana,
      );
    } else {
      chave = formatInTimeZone(dataPagamento, timezone, "yyyy-MM-dd");
      rotulo = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
        dataPagamento,
      );
    }

    const bucket = buckets.get(chave) ?? { chave, rotulo, avulso: 0, plano: 0 };
    if (payment.origem === "avulso") bucket.avulso += payment.valor;
    else bucket.plano += payment.valor;
    buckets.set(chave, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}

export function aggregateByService(
  payments: FinancePayment[],
  appointmentServiceMap: Map<string, string>,
  servicesById: Map<string, string>,
  limite = 8,
): ServiceRevenue[] {
  const totals = new Map<string, number>();

  for (const payment of payments) {
    const serviceId = appointmentServiceMap.get(payment.appointment_id);
    if (!serviceId) continue;
    totals.set(serviceId, (totals.get(serviceId) ?? 0) + payment.valor);
  }

  const ordenado = [...totals.entries()]
    .map(([serviceId, total]) => ({
      serviceId,
      nome: servicesById.get(serviceId) ?? "Serviço removido",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  if (ordenado.length <= limite) return ordenado;

  const principais = ordenado.slice(0, limite - 1);
  const outros = ordenado.slice(limite - 1).reduce((acc, item) => acc + item.total, 0);
  return [...principais, { serviceId: "outros", nome: "Outros", total: outros }];
}

export function aggregateByFormaPagamento(payments: FinancePayment[]): PaymentMethodRevenue[] {
  const totals = new Map<FormaPagamento, number>();
  for (const payment of payments) {
    totals.set(payment.forma_pagamento, (totals.get(payment.forma_pagamento) ?? 0) + payment.valor);
  }

  return (Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[])
    .map((forma) => ({ forma, label: FORMA_PAGAMENTO_LABELS[forma], total: totals.get(forma) ?? 0 }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}
