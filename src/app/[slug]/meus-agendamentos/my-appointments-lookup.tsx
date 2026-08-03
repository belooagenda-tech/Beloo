"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Search } from "lucide-react";
import {
  findAppointmentsAction,
  cancelAppointmentAction,
  subscribeClientPushByPhoneAction,
  type PublicAppointmentSummary,
} from "../actions";
import { ClientPushOptIn } from "@/components/client-push-opt-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function MyAppointmentsLookup({ slug, timezone }: { slug: string; timezone: string }) {
  const [telefone, setTelefone] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agendamentos, setAgendamentos] = useState<PublicAppointmentSummary[]>([]);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [alvoCancelamento, setAlvoCancelamento] = useState<PublicAppointmentSummary | null>(null);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setBuscando(true);
    setErro(null);
    const resultado = await findAppointmentsAction(slug, telefone);
    setBuscando(false);
    setBuscou(true);

    if (!resultado.ok) {
      setErro(resultado.error);
      setAgendamentos([]);
      return;
    }
    setAgendamentos(resultado.agendamentos);
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
        agendamentos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum agendamento futuro encontrado para esse número.
          </p>
        ) : (
          <>
            <ClientPushOptIn
              onSubscribe={(sub) => subscribeClientPushByPhoneAction(slug, telefone, sub)}
              label="Ativar lembretes por notificação"
            />
            <ul className="space-y-2">
              {agendamentos.map((agendamento) => (
                <li key={agendamento.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {agendamento.servicoNome}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {new Intl.DateTimeFormat("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          }).format(new Date(agendamento.inicio))}{" "}
                          às {formatInTimeZone(new Date(agendamento.inicio), timezone, "HH:mm")}
                        </p>
                      </div>
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
                      ) : (
                        <span className="text-xs text-muted-foreground">Fora do prazo</span>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
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
    </div>
  );
}
