"use client";

import { formatInTimeZone } from "date-fns-tz";
import { MoreVertical } from "lucide-react";
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
import type { AgendaAppointment, AgendaClient, AgendaPayment, AgendaService } from "./types";

const STATUS_META: Record<
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
  timezone,
  onConfirm,
  onCancel,
  onNoShow,
  onComplete,
}: {
  appointment: AgendaAppointment;
  service: AgendaService | undefined;
  client: AgendaClient | undefined;
  payment: AgendaPayment | undefined;
  timezone: string;
  onConfirm: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onComplete: () => void;
}) {
  const status = STATUS_META[appointment.status];
  const podeAgir = appointment.status === "agendado" || appointment.status === "confirmado";

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
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
          <p className="truncate text-sm text-muted-foreground">
            {service?.nome ?? "Serviço"}
            {payment ? (
              <>
                {" "}
                ·{" "}
                {payment.origem === "plano" ? "incluso no plano" : formatarPreco(payment.valor)}
              </>
            ) : null}
          </p>
        </div>

        {podeAgir || appointment.status === "concluido" ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Ações do agendamento">
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {appointment.status === "agendado" ? (
                <DropdownMenuItem onClick={onConfirm}>Confirmar</DropdownMenuItem>
              ) : null}
              {podeAgir ? (
                <DropdownMenuItem onClick={onComplete}>Concluir e receber</DropdownMenuItem>
              ) : null}
              {appointment.status === "concluido" ? (
                <DropdownMenuItem onClick={onComplete}>Editar pagamento</DropdownMenuItem>
              ) : null}
              {podeAgir ? (
                <DropdownMenuItem onClick={onNoShow}>Não compareceu</DropdownMenuItem>
              ) : null}
              {podeAgir ? (
                <DropdownMenuItem onClick={onCancel} variant="destructive">
                  Cancelar
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardContent>
    </Card>
  );
}
