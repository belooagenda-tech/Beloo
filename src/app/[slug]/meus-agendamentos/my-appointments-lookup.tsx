"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Search, Star } from "lucide-react";
import {
  findAppointmentsAction,
  findRatableAppointmentsAction,
  findAppointmentHistoryAction,
  cancelAppointmentAction,
  subscribeClientPushByPhoneAction,
  type PublicAppointmentSummary,
  type RatableAppointment,
  type AppointmentHistoryItem,
} from "../actions";
import { ClientPushOptIn } from "@/components/client-push-opt-in";
import { RescheduleDialog } from "./reschedule-dialog";
import { RateAppointmentDialog } from "./rate-appointment-dialog";
import { capitalizeFirst, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const HISTORICO_STATUS_META: Record<
  AppointmentHistoryItem["status"],
  { label: string; className: string }
> = {
  aguardando_pagamento: { label: "Aguardando pagamento", className: "bg-warning/15 text-warning" },
  agendado: { label: "Agendado", className: "bg-muted text-muted-foreground" },
  confirmado: { label: "Confirmado", className: "bg-secondary text-secondary-foreground" },
  concluido: { label: "Concluído", className: "bg-success/15 text-success" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
  nao_compareceu: { label: "Não compareceu", className: "bg-warning/15 text-warning" },
};

export function MyAppointmentsLookup({
  slug,
  timezone,
  nomeLoja,
  instagramUrl,
  googleReviewUrl,
}: {
  slug: string;
  timezone: string;
  nomeLoja: string;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const [telefone, setTelefone] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agendamentos, setAgendamentos] = useState<PublicAppointmentSummary[]>([]);
  const [avaliaveis, setAvaliaveis] = useState<RatableAppointment[]>([]);
  const [historico, setHistorico] = useState<AppointmentHistoryItem[]>([]);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [alvoCancelamento, setAlvoCancelamento] = useState<PublicAppointmentSummary | null>(null);
  const [alvoReagendamento, setAlvoReagendamento] = useState<PublicAppointmentSummary | null>(null);
  const [alvoAvaliacao, setAlvoAvaliacao] = useState<RatableAppointment | null>(null);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setBuscando(true);
    setErro(null);
    const [resultado, resultadoAvaliaveis, resultadoHistorico] = await Promise.all([
      findAppointmentsAction(slug, telefone),
      findRatableAppointmentsAction(slug, telefone),
      findAppointmentHistoryAction(slug, telefone),
    ]);
    setBuscando(false);
    setBuscou(true);

    if (!resultado.ok) {
      setErro(resultado.error);
      setAgendamentos([]);
      setAvaliaveis([]);
      setHistorico([]);
      return;
    }
    setAgendamentos(resultado.agendamentos);
    setAvaliaveis(resultadoAvaliaveis.ok ? resultadoAvaliaveis.agendamentos : []);
    setHistorico(resultadoHistorico.ok ? resultadoHistorico.agendamentos : []);
  }

  async function handleCancelar() {
    if (!alvoCancelamento) return;
    setCancelando(alvoCancelamento.id);
    const resultado = await cancelAppointmentAction(slug, alvoCancelamento.id, telefone);
    setCancelando(null);

    if (!resultado.ok) {
      toast.error(resultado.error);
      setAlvoCancelamento(null);
      return;
    }

    setAgendamentos((prev) => prev.filter((a) => a.id !== alvoCancelamento.id));
    setAlvoCancelamento(null);
    toast.success("Agendamento cancelado.");
  }

  function handleRescheduled(appointmentId: string, novoInicio: string) {
    setAgendamentos((prev) =>
      prev
        .map((a) => (a.id === appointmentId ? { ...a, inicio: novoInicio, status: "agendado" as const } : a))
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    );
    setAlvoReagendamento(null);
    toast.success("Agendamento remarcado.");
  }

  function handleRated(appointmentId: string) {
    setAvaliaveis((prev) => prev.filter((a) => a.id !== appointmentId));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleBuscar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="telefone-busca">Seu WhatsApp</Label>
          <Input
            id="telefone-busca"
            placeholder="(21) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={buscando}>
          <Search className="size-4" />
          {buscando ? "Buscando..." : "Buscar agendamentos"}
        </Button>
      </form>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      ) : null}

      {buscou && !erro ? (
        agendamentos.length === 0 && avaliaveis.length === 0 && historico.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum agendamento encontrado para esse número.
          </p>
        ) : (
          <>
            {agendamentos.length > 0 ? (
              <ClientPushOptIn
                onSubscribe={(sub) => subscribeClientPushByPhoneAction(slug, telefone, sub)}
                label="Ativar lembretes por notificação"
              />
            ) : null}

            {agendamentos.length > 0 ? (
              <ul className="space-y-2">
                {agendamentos.map((agendamento) => (
                  <li key={agendamento.id}>
                    <Card>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {agendamento.servicoNome}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {capitalizeFirst(
                              new Intl.DateTimeFormat("pt-BR", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              }).format(new Date(agendamento.inicio)),
                            )}{" "}
                            às {formatInTimeZone(new Date(agendamento.inicio), timezone, "HH:mm")}
                          </p>
                          {agendamento.entradaPaga > 0 ? (
                            <p className="mt-0.5 text-xs font-medium text-success">
                              Pago: {formatarPreco(agendamento.entradaPaga)}
                              {agendamento.restanteAPagar > 0
                                ? ` — falta ${formatarPreco(agendamento.restanteAPagar)} no local`
                                : " — valor total já quitado"}
                            </p>
                          ) : null}
                        </div>
                        {agendamento.podeCancelar || agendamento.podeReagendar ? (
                          <div className="flex shrink-0 items-center gap-2">
                            {agendamento.podeReagendar ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAlvoReagendamento(agendamento)}
                              >
                                Reagendar
                              </Button>
                            ) : null}
                            {agendamento.podeCancelar ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAlvoCancelamento(agendamento)}
                                disabled={cancelando === agendamento.id}
                              >
                                Cancelar
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Fora do prazo</span>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}

            {avaliaveis.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Avalie seu atendimento</p>
                <ul className="space-y-2">
                  {avaliaveis.map((agendamento) => (
                    <li key={agendamento.id}>
                      <Card className="border-dashed">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {agendamento.servicoNome}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
                                new Date(agendamento.inicio),
                              )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAlvoAvaliacao(agendamento)}
                          >
                            <Star className="size-4" />
                            Avaliar
                          </Button>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {historico.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Histórico</p>
                <ul className="space-y-2">
                  {historico.map((agendamento) => {
                    const status = HISTORICO_STATUS_META[agendamento.status];
                    return (
                      <li key={agendamento.id}>
                        <Card>
                          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {agendamento.servicoNome}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Intl.DateTimeFormat("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }).format(new Date(agendamento.inicio))}{" "}
                                às {formatInTimeZone(new Date(agendamento.inicio), timezone, "HH:mm")}
                              </p>
                              {agendamento.motivoCancelamento ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Motivo: {agendamento.motivoCancelamento}
                                </p>
                              ) : null}
                            </div>
                            <Badge className={cn("shrink-0", status.className)} variant="secondary">
                              {status.label}
                            </Badge>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )
      ) : null}

      <AlertDialog
        open={alvoCancelamento !== null}
        onOpenChange={(open) => !open && setAlvoCancelamento(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {alvoCancelamento ? (
                <>
                  {alvoCancelamento.servicoNome} —{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }).format(new Date(alvoCancelamento.inicio))}{" "}
                  às {formatInTimeZone(new Date(alvoCancelamento.inicio), timezone, "HH:mm")}. Essa
                  ação não pode ser desfeita.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelar} disabled={cancelando !== null}>
              {cancelando ? "Cancelando..." : "Cancelar agendamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleDialog
        open={alvoReagendamento !== null}
        onOpenChange={(open) => !open && setAlvoReagendamento(null)}
        slug={slug}
        timezone={timezone}
        telefone={telefone}
        appointment={alvoReagendamento}
        onRescheduled={handleRescheduled}
      />

      <RateAppointmentDialog
        open={alvoAvaliacao !== null}
        onOpenChange={(open) => !open && setAlvoAvaliacao(null)}
        slug={slug}
        telefone={telefone}
        appointment={alvoAvaliacao}
        onRated={handleRated}
        nomeLoja={nomeLoja}
        instagramUrl={instagramUrl}
        googleReviewUrl={googleReviewUrl}
      />
    </div>
  );
}
