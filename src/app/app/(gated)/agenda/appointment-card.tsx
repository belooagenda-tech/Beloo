"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CircleDollarSign, Clock3, MessageCircle, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { evaluatePlanCoverage } from "@/lib/booking/plan-coverage";
import { buildAppointmentReminderMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import type {
  AgendaAppointment,
  AgendaClient,
  AgendaClientPlan,
  AgendaPayment,
  AgendaProduct,
  AgendaService,
} from "./types";

export const STATUS_META: Record<
  AgendaAppointment["status"],
  { label: string; className: string }
> = {
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

export function AppointmentCard({
  appointment,
  service,
  client,
  payment,
  products,
  clientPlan,
  timezone,
  nomeLoja,
  slug,
  whatsappTemplate,
  onConfirm,
  onCancel,
  onNoShow,
  onComplete,
  onChargeAdvance,
}: {
  appointment: AgendaAppointment;
  service: AgendaService | undefined;
  client: AgendaClient | undefined;
  payment: AgendaPayment | undefined;
  products: AgendaProduct[];
  clientPlan: AgendaClientPlan | undefined;
  timezone: string;
  nomeLoja: string;
  slug: string;
  whatsappTemplate: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onComplete: () => void;
  onChargeAdvance: () => void;
}) {
  const status = STATUS_META[appointment.status];
  const podeAgir = appointment.status === "agendado" || appointment.status === "confirmado";

  // Link pronto do WhatsApp pra lembrar o cliente do horário — só faz
  // sentido antes do atendimento acontecer (não pra concluído/cancelado).
  // Inclui o link de "Meus agendamentos" pra remarcar/cancelar sem precisar
  // pedir pro profissional fazer isso por fora.
  const whatsappLink =
    podeAgir && client
      ? buildWhatsAppLink(
          client.telefone,
          buildAppointmentReminderMessage({
            clienteNome: client.nome,
            servicoNome: service?.nome ?? "seu atendimento",
            nomeLoja,
            dataHoraFormatada: formatInTimeZone(new Date(appointment.inicio), timezone, "dd/MM 'às' HH:mm"),
            linkGerenciar: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${slug}/meus-agendamentos`,
            template: whatsappTemplate,
          }),
        )
      : null;

  // Mostra o plano do cliente ANTES de concluir o atendimento, pra ajudar o
  // profissional a decidir como cobrar — depois de concluído, essa mesma
  // informação já vem embutida no `payment` (origem: "plano").
  const coverage =
    clientPlan && service && appointment.status !== "concluido" && appointment.status !== "cancelado"
      ? evaluatePlanCoverage(
          { servicos_inclusos: clientPlan.servicosInclusos },
          { creditos_usados: clientPlan.creditosUsados },
          service.id,
        )
      : null;

  // Entrada paga via Mercado Pago mas atendimento ainda não concluído — o
  // profissional precisa ver isso na Agenda, senão cobra o valor cheio de
  // novo na hora. Depois de concluído, essa informação já vem embutida no
  // `payment` (registro final de appointment_payments).
  const entradaJaPaga =
    appointment.entrada_status === "pago" && appointment.status !== "concluido"
      ? (appointment.entrada_valor ?? 0)
      : 0;
  const entradaEstornada =
    appointment.status === "cancelado" && appointment.entrada_status === "reembolsado";

  // O valor pago antecipadamente pode ter vindo tanto da entrada cobrada no
  // ato do agendamento público quanto de um link gerado depois na Agenda
  // (ver createAdvancePaymentLinkAction) — mesmas colunas, mesmo aviso aqui.
  const pagoIntegralmente = entradaJaPaga > 0 && service !== undefined && entradaJaPaga >= service.preco;
  const cobrancaPendente = podeAgir && appointment.entrada_status === "pendente";

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: service?.cor ?? "#7C3AED" }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {formatInTimeZone(new Date(appointment.inicio), timezone, "HH:mm")}–
                {formatInTimeZone(new Date(appointment.fim), timezone, "HH:mm")}
              </p>
              <Badge className={cn("shrink-0", status.className)} variant="secondary">
                {status.label}
              </Badge>
            </div>
            <p className="truncate text-sm text-foreground">{client?.nome ?? "Cliente"}</p>
            {clientPlan && coverage ? (
              <p className="mt-0.5 truncate text-xs">
                {coverage.covered ? (
                  <span className="font-medium text-success">
                    Tem o plano {clientPlan.planoNome} · cobre este serviço
                    {coverage.limite !== null ? ` (${coverage.usados}/${coverage.limite} usados)` : ""}
                  </span>
                ) : coverage.motivo === "sem_creditos" ? (
                  <span className="font-medium text-warning">
                    Tem o plano {clientPlan.planoNome} · sem créditos deste serviço no ciclo
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Tem o plano {clientPlan.planoNome} · não cobre este serviço
                  </span>
                )}
              </p>
            ) : null}
            <p className="truncate text-sm text-muted-foreground">
              {service?.nome ?? "Serviço"}
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
            {products.length > 0 ? (
              <p className="truncate text-xs text-muted-foreground">
                + {products.map((p) => `${p.quantidade}× ${p.nome_snapshot}`).join(", ")}
              </p>
            ) : null}
            {entradaJaPaga > 0 ? (
              <p className="mt-0.5 text-xs font-medium text-success">
                {pagoIntegralmente
                  ? `Pago integralmente: ${formatarPreco(entradaJaPaga)}`
                  : `Entrada paga: ${formatarPreco(entradaJaPaga)}${service ? ` de ${formatarPreco(service.preco)}` : ""} — falta cobrar o restante`}
              </p>
            ) : null}
            {cobrancaPendente ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning">
                <Clock3 className="size-3" />
                Aguardando pagamento do link enviado
              </p>
            ) : null}
            {entradaEstornada ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Entrada estornada ao cliente</p>
            ) : null}
          </div>
        </div>

        {/* Ações mais usadas ficam como botão visível — só as menos comuns
            (não compareceu, cancelar) vão pro menu "⋮", pra não exigir abrir
            um menu pra toda ação do dia a dia. */}
        {podeAgir || appointment.status === "concluido" ? (
          <div className="flex flex-wrap items-center gap-2 pl-[22px]">
            {appointment.status === "agendado" ? (
              <Button type="button" size="sm" variant="outline" onClick={onConfirm}>
                Confirmar
              </Button>
            ) : null}
            {podeAgir ? (
              <Button type="button" size="sm" onClick={onComplete}>
                Concluir e receber
              </Button>
            ) : null}
            {appointment.status === "concluido" ? (
              <Button type="button" size="sm" variant="outline" onClick={onComplete}>
                Editar pagamento
              </Button>
            ) : null}
            {whatsappLink ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<a href={whatsappLink} target="_blank" rel="noreferrer" />}
              >
                <MessageCircle className="size-4" />
                Lembrar no WhatsApp
              </Button>
            ) : null}
            {podeAgir && appointment.entrada_status !== "pago" ? (
              <Button type="button" size="sm" variant="outline" onClick={onChargeAdvance}>
                <CircleDollarSign className="size-4" />
                {cobrancaPendente ? "Reenviar cobrança" : "Cobrar online"}
              </Button>
            ) : null}
            {podeAgir ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label="Mais ações do agendamento">
                      <MoreVertical className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onNoShow}>Não compareceu</DropdownMenuItem>
                  <DropdownMenuItem onClick={onCancel} variant="destructive">
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
