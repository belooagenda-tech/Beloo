"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPhoneBR } from "@/lib/phone";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/supabase/types";
import { EditClientDialog } from "./edit-client-dialog";
import { AssignPlanDialog } from "./assign-plan-dialog";
import { PlanActions } from "./plan-actions";
import type {
  ActivePlan,
  AvailablePlan,
  ClientDetail,
  ClientRating,
  HistoryAppointment,
  HistoryPayment,
  PlanPaymentHistoryItem,
  ServiceLookup,
} from "./types";

const FORMA_COBRANCA_LABEL: Record<ActivePlan["formaCobranca"], string> = {
  manual: "",
  cartao_recorrente: "Renovação automática via cartão",
  pix_ciclico: "Pagamento por Pix a cada ciclo",
};

const PAGAMENTO_STATUS_LABEL: Record<ActivePlan["pagamentoStatus"], { label: string; className: string }> = {
  pendente: { label: "Aguardando pagamento", className: "bg-warning/15 text-warning" },
  ativo: { label: "Em dia", className: "bg-success/15 text-success" },
  atrasado: { label: "Atrasado", className: "bg-destructive/10 text-destructive" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", className: "bg-warning/15 text-warning" },
  agendado: { label: "Agendado", className: "bg-muted text-muted-foreground" },
  confirmado: { label: "Confirmado", className: "bg-secondary text-secondary-foreground" },
  concluido: { label: "Concluído", className: "bg-success/15 text-success" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
  nao_compareceu: { label: "Não compareceu", className: "bg-warning/15 text-warning" },
};

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

export function ClientProfile({
  client: clientInicial,
  slug,
  nomeLoja,
  timezone,
  services,
  appointments,
  payments,
  activePlan,
  planPayments,
  availablePlans,
  totalGastoAvulso,
  totalVisitas,
  ultimaVisita,
  ratings,
  notaMedia,
}: {
  client: ClientDetail;
  slug: string;
  nomeLoja: string;
  timezone: string;
  services: ServiceLookup[];
  appointments: HistoryAppointment[];
  payments: HistoryPayment[];
  activePlan: ActivePlan | null;
  planPayments: PlanPaymentHistoryItem[];
  availablePlans: AvailablePlan[];
  totalGastoAvulso: number;
  totalVisitas: number;
  ultimaVisita: string | null;
  ratings: ClientRating[];
  notaMedia: number | null;
}) {
  const [client, setClient] = useState(clientInicial);
  const servicesById = new Map(services.map((s) => [s.id, s.nome]));
  const paymentsByAppointment = new Map(payments.map((p) => [p.appointment_id, p]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">{client.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatPhoneBR(client.telefone)}</p>
          <p className="text-sm text-muted-foreground">
            Cliente desde {formatarData(client.criado_em)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={buildWhatsAppLink(client.telefone, `Oi, ${client.nome}! Aqui é da ${nomeLoja}.`)}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
          <EditClientDialog client={client} onSaved={setClient} />
        </div>
      </div>

      {client.observacoes ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm whitespace-pre-wrap text-foreground">{client.observacoes}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">
              {formatarPreco(totalGastoAvulso)}
            </p>
            <p className="text-xs text-muted-foreground">Total gasto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">{totalVisitas}</p>
            <p className="text-xs text-muted-foreground">Visitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-lg font-semibold text-foreground">
              {ultimaVisita ? formatarData(ultimaVisita) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Última visita</p>
          </CardContent>
        </Card>
      </div>

      {ratings.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Avaliações</CardTitle>
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-warning text-warning" />
              <span className="text-sm font-semibold text-foreground">{notaMedia?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({ratings.length} avaliaç{ratings.length === 1 ? "ão" : "ões"})
              </span>
            </div>
          </CardHeader>
          {ratings.some((r) => r.comentario) ? (
            <CardContent className="space-y-2">
              {ratings
                .filter((r) => r.comentario)
                .slice(0, 5)
                .map((r) => (
                  <div key={r.id} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3",
                            i < r.nota ? "fill-warning text-warning" : "text-muted-foreground",
                          )}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">{formatarData(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{r.comentario}</p>
                  </div>
                ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {activePlan ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Plano ativo: {activePlan.planNome}</CardTitle>
            {activePlan.formaCobranca !== "manual" ? (
              <Badge className={PAGAMENTO_STATUS_LABEL[activePlan.pagamentoStatus].className} variant="secondary">
                {PAGAMENTO_STATUS_LABEL[activePlan.pagamentoStatus].label}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {activePlan.formaCobranca !== "manual"
                ? FORMA_COBRANCA_LABEL[activePlan.formaCobranca]
                : `Renova em ${formatarData(activePlan.dataRenovacao)}`}
            </p>
            <ul className="space-y-1">
              {activePlan.itens.map((item) => (
                <li
                  key={item.serviceId}
                  className="flex items-center justify-between text-sm text-foreground"
                >
                  <span>{item.serviceNome}</span>
                  <span className="text-muted-foreground">
                    {item.limite === null ? `${item.usados} usados (ilimitado)` : `${item.usados}/${item.limite} usados`}
                  </span>
                </li>
              ))}
            </ul>
            {planPayments.length > 0 ? (
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-xs font-medium text-muted-foreground">Últimos pagamentos</p>
                {planPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatarData(p.ciclo_referencia)}</span>
                    <span>
                      {formatarPreco(p.valor)} · {p.forma_pagamento === "cartao" ? "Cartão" : "Pix"} ·{" "}
                      {p.status === "pago" ? "Pago" : p.status === "reembolsado" ? "Reembolsado" : p.status === "falhou" ? "Falhou" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <PlanActions plan={activePlan} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">Este cliente não tem plano ativo.</p>
            <AssignPlanDialog
              clientId={client.id}
              clientTelefone={client.telefone}
              slug={slug}
              availablePlans={availablePlans}
            />
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
          Histórico de agendamentos
        </h2>
        {appointments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum agendamento ainda.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {appointments.map((appointment) => {
              const payment = paymentsByAppointment.get(appointment.id);
              const status = STATUS_META[appointment.status];
              return (
                <li key={appointment.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatInTimeZone(new Date(appointment.inicio), timezone, "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {servicesById.get(appointment.service_id) ?? "Serviço removido"}
                          {payment ? (
                            <>
                              {" "}
                              ·{" "}
                              {payment.origem === "plano"
                                ? "incluso no plano"
                                : payment.forma_pagamento === "misto" && payment.entrada_valor
                                  ? `${formatarPreco(payment.valor)} (${formatarPreco(payment.entrada_valor)} online + ${formatarPreco(payment.valor - payment.entrada_valor)} na hora)`
                                  : payment.forma_pagamento === "entrada_mp"
                                    ? `${formatarPreco(payment.valor)} · pago online`
                                    : formatarPreco(payment.valor)}
                            </>
                          ) : null}
                        </p>
                        {appointment.status === "cancelado" && appointment.motivo_cancelamento ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            Motivo: {appointment.motivo_cancelamento}
                          </p>
                        ) : null}
                      </div>
                      <Badge className={status.className} variant="secondary">
                        {status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
