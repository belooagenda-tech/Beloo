"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhoneBR } from "@/lib/phone";
import type { AppointmentStatus } from "@/lib/supabase/types";
import { EditClientDialog } from "./edit-client-dialog";
import { AssignPlanDialog } from "./assign-plan-dialog";
import { PlanActions } from "./plan-actions";
import type {
  ActivePlan,
  AvailablePlan,
  ClientDetail,
  HistoryAppointment,
  HistoryPayment,
  ServiceLookup,
} from "./types";

const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
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
  timezone,
  services,
  appointments,
  payments,
  activePlan,
  availablePlans,
  totalGastoAvulso,
  totalVisitas,
  ultimaVisita,
}: {
  client: ClientDetail;
  timezone: string;
  services: ServiceLookup[];
  appointments: HistoryAppointment[];
  payments: HistoryPayment[];
  activePlan: ActivePlan | null;
  availablePlans: AvailablePlan[];
  totalGastoAvulso: number;
  totalVisitas: number;
  ultimaVisita: string | null;
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
        <EditClientDialog client={client} onSaved={setClient} />
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

      {activePlan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plano ativo: {activePlan.planNome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Renova em {formatarData(activePlan.dataRenovacao)}
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
            <PlanActions plan={activePlan} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">Este cliente não tem plano ativo.</p>
            <AssignPlanDialog clientId={client.id} availablePlans={availablePlans} />
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
                                : formatarPreco(payment.valor)}
                            </>
                          ) : null}
                        </p>
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
