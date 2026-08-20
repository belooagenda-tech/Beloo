"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Unlink, Loader2 } from "lucide-react";
import {
  disconnectGoogleCalendarAction,
  toggleGoogleCalendarExportAction,
  listGoogleCalendarEventsAction,
  importGoogleCalendarEventsAction,
} from "./google-calendar-actions";
import type { ImportableGoogleEvent } from "@/lib/google-calendar/event-mapping";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatEventRange(event: ImportableGoogleEvent): string {
  if (event.allDay) {
    return new Date(`${event.startISO}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const inicio = new Date(event.startISO);
  const fim = new Date(event.endISO);
  const dataFmt = inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaInicio = inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const horaFim = fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dataFmt} · ${horaInicio}–${horaFim}`;
}

function ImportEventsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<ImportableGoogleEvent[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;

    setLoading(true);
    setError(null);
    setEvents(null);
    setSelected(new Set());

    const resultado = await listGoogleCalendarEventsAction();
    setLoading(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setEvents(resultado.events);
  }

  function toggleEvent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!events) return;
    const disponiveis = events.filter((e) => !e.alreadyImported);
    setSelected((prev) =>
      prev.size === disponiveis.length ? new Set() : new Set(disponiveis.map((e) => e.id)),
    );
  }

  async function handleImportar() {
    if (selected.size === 0) return;
    setImporting(true);
    const resultado = await importGoogleCalendarEventsAction([...selected]);
    setImporting(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(
      resultado.importados > 0
        ? `${resultado.importados} agendamento(s) trazido(s) para a Beloo.`
        : "Nenhum agendamento novo para trazer — os escolhidos já tinham sido importados.",
    );
    setOpen(false);
    router.refresh();
  }

  const disponiveis = events?.filter((e) => !e.alreadyImported) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm">Importar agendamentos</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar do Google Calendar</DialogTitle>
          <DialogDescription>
            Escolha quais compromissos do seu Google Calendar você quer trazer para a Agenda da
            Beloo. Eles entram como horários bloqueados — não aparecem mais como disponíveis no
            seu link público.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Buscando seus eventos...
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : events && events.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum evento encontrado no seu Google Calendar nos últimos 30 dias ou próximos 180
            dias.
          </p>
        ) : events ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {selected.size === disponiveis.length ? "Limpar seleção" : "Selecionar todos"}
            </button>
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border">
              {events.map((event) => (
                <label
                  key={event.id}
                  className="flex items-start gap-3 border-b border-border p-3 text-sm last:border-b-0 has-disabled:opacity-50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                    checked={event.alreadyImported || selected.has(event.id)}
                    disabled={event.alreadyImported}
                    onChange={() => toggleEvent(event.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{event.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatEventRange(event)}
                      {event.alreadyImported ? " · já importado" : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={handleImportar}
            disabled={selected.size === 0 || importing}
          >
            {importing ? "Importando..." : `Importar${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GoogleCalendarCard({
  connected,
  googleEmail,
  initialExportEnabled,
}: {
  connected: boolean;
  googleEmail: string | null;
  initialExportEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exportEnabled, setExportEnabled] = useState(initialExportEnabled);
  const [salvando, setSalvando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  useEffect(() => {
    const status = searchParams.get("google");
    if (status === "conectado") {
      toast.success("Google Calendar conectado com sucesso.");
      router.replace("/app/configuracoes");
    } else if (status === "erro") {
      toast.error("Não foi possível conectar seu Google Calendar. Tente novamente.");
      router.replace("/app/configuracoes");
    } else if (status === "cancelado") {
      router.replace("/app/configuracoes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleToggleExport(checked: boolean) {
    setExportEnabled(checked);
    setSalvando(true);
    const resultado = await toggleGoogleCalendarExportAction(checked);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      setExportEnabled(!checked);
      return;
    }
    toast.success("Preferência salva.");
  }

  async function handleDesconectar() {
    setDesconectando(true);
    await disconnectGoogleCalendarAction();
    setDesconectando(false);
    router.refresh();
    toast.success("Google Calendar desconectado.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {connected ? "Google Calendar conectado" : "Nenhuma conta conectada"}
              </p>
              {connected && googleEmail ? (
                <p className="text-xs text-muted-foreground">{googleEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Conecte para trazer seus compromissos e enviar os agendamentos da Beloo pra lá.
                </p>
              )}
            </div>
          </div>

          {connected ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Unlink className="size-4" />
                    Desconectar
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar Google Calendar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Novos agendamentos param de ser enviados para sua agenda do Google. Os eventos
                    já criados lá e os horários já importados para a Beloo não são apagados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDesconectar} disabled={desconectando}>
                    {desconectando ? "Desconectando..." : "Desconectar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/api/google-calendar/connect">Conectar Google Calendar</Link>}
            />
          )}
        </div>

        {connected ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="google-export-ativo" className="text-sm font-medium text-foreground">
                  Enviar agendamentos da Beloo para o Google Calendar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Todo agendamento criado, remarcado ou cancelado na Beloo é espelhado
                  automaticamente na sua agenda do Google.
                </p>
              </div>
              <Switch
                id="google-export-ativo"
                checked={exportEnabled}
                disabled={salvando}
                onCheckedChange={handleToggleExport}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Trazer compromissos do Google</p>
                <p className="text-xs text-muted-foreground">
                  Escolha, um por um, quais eventos do Google Calendar viram horários bloqueados na
                  sua Agenda.
                </p>
              </div>
              <ImportEventsDialog />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
