"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./appointment-card";
import type { TimeBlock } from "@/lib/agenda/day-window";
import type { AgendaClient, AgendaDayItem, AgendaService } from "./types";

const ROW_HEIGHT_PX = 56; // altura de 1 hora na grade
const MIN_ITEM_HEIGHT_PX = 24;
const LABEL_OFFSET_PX = 56; // largura reservada pro rótulo de hora (w-12 + pr-2)

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function domIdForDayItem(item: AgendaDayItem): string {
  return item.kind === "appointment"
    ? `agenda-item-appointment-${item.appointment.id}`
    : `agenda-item-block-${item.block.id}`;
}

export function AgendaTimelineView({
  dayItems,
  dayBlocks,
  timezone,
  dataSelecionada,
  hojeStr,
  servicesById,
  clientsById,
  onSelectItem,
}: {
  dayItems: AgendaDayItem[];
  dayBlocks: TimeBlock[];
  timezone: string;
  dataSelecionada: string;
  hojeStr: string;
  servicesById: Map<string, AgendaService>;
  clientsById: Map<string, AgendaClient>;
  onSelectItem: (domId: string) => void;
}) {
  if (dayBlocks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sem expediente cadastrado para este dia — confira em Disponibilidade.
        </CardContent>
      </Card>
    );
  }

  const businessStart = Math.min(...dayBlocks.map((b) => toMinutes(b.hora_inicio)));
  const businessEnd = Math.max(...dayBlocks.map((b) => toMinutes(b.hora_fim)));

  // Início/fim (em minutos, dentro do próprio dia) de cada item — com um
  // piso de 15min quando o horário de término calculado ficar antes do
  // início (agendamento perto da meia-noite, cujo `fim` cai no dia seguinte).
  function itemRange(item: AgendaDayItem): { inicio: number; fim: number } {
    const fimIso = item.kind === "appointment" ? item.appointment.fim : item.block.fim;
    const inicio = toMinutes(formatInTimeZone(new Date(item.inicio), timezone, "HH:mm"));
    const fimBruto = toMinutes(formatInTimeZone(new Date(fimIso), timezone, "HH:mm"));
    const fim = fimBruto > inicio ? fimBruto : inicio + 15;
    return { inicio, fim };
  }

  // Um agendamento manual pode ter sido criado fora do expediente cadastrado
  // (a criação manual não valida contra Disponibilidade) — em vez de cortar
  // esse item da grade, a janela visível se estende pra incluir tudo que
  // existe no dia, então nada fica escondido.
  const ranges = dayItems.map(itemRange);
  const timelineStart = Math.min(businessStart, ...ranges.map((r) => r.inicio));
  const timelineEnd = Math.max(businessEnd, ...ranges.map((r) => r.fim));
  const pxPerMin = ROW_HEIGHT_PX / 60;
  const totalHeight = (timelineEnd - timelineStart) * pxPerMin;

  const horas: number[] = [];
  for (let h = Math.floor(timelineStart / 60); h <= Math.ceil(timelineEnd / 60); h++) {
    horas.push(h);
  }

  // Intervalos fora do expediente entre blocos do mesmo dia (ex.: almoço).
  const blocosOrdenados = [...dayBlocks].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const gaps: { inicio: number; fim: number }[] = [];
  for (let i = 0; i < blocosOrdenados.length - 1; i++) {
    const fimAtual = toMinutes(blocosOrdenados[i].hora_fim);
    const inicioProximo = toMinutes(blocosOrdenados[i + 1].hora_inicio);
    if (inicioProximo > fimAtual) gaps.push({ inicio: fimAtual, fim: inicioProximo });
  }

  const minutoAgora =
    dataSelecionada === hojeStr ? toMinutes(formatInTimeZone(new Date(), timezone, "HH:mm")) : null;
  const mostrarLinhaAgora =
    minutoAgora !== null && minutoAgora >= timelineStart && minutoAgora <= timelineEnd;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative" style={{ height: totalHeight }}>
        {horas.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-border/60"
            style={{ top: (h * 60 - timelineStart) * pxPerMin }}
          >
            <span className="-mt-2.5 inline-block w-12 bg-card pr-2 text-right text-xs text-muted-foreground">
              {String(((h % 24) + 24) % 24).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {gaps.map((gap, i) => (
          <div
            key={i}
            className="absolute right-1 rounded-sm bg-muted/40"
            style={{
              left: LABEL_OFFSET_PX,
              top: (gap.inicio - timelineStart) * pxPerMin,
              height: (gap.fim - gap.inicio) * pxPerMin,
            }}
          />
        ))}

        {mostrarLinhaAgora ? (
          <div
            className="absolute right-1 z-10 flex items-center gap-1"
            style={{ left: LABEL_OFFSET_PX, top: (minutoAgora! - timelineStart) * pxPerMin }}
          >
            <span className="h-px flex-1 bg-destructive" />
            <span className="mr-1 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
          </div>
        ) : null}

        {dayItems.map((item, index) => {
          const { inicio, fim } = ranges[index];
          const top = (inicio - timelineStart) * pxPerMin;
          const height = Math.max((fim - inicio) * pxPerMin, MIN_ITEM_HEIGHT_PX);
          const domId = domIdForDayItem(item);

          if (item.kind === "block") {
            return (
              <button
                key={domId}
                type="button"
                onClick={() => onSelectItem(domId)}
                className="absolute right-1 overflow-hidden rounded-md border border-dashed border-border bg-muted/60 px-2 py-1 text-left text-xs text-muted-foreground"
                style={{ left: LABEL_OFFSET_PX, top, height }}
              >
                Bloqueado{item.block.motivo ? ` · ${item.block.motivo}` : ""}
              </button>
            );
          }

          const appointment = item.appointment;
          const service = servicesById.get(appointment.service_id);
          const client = clientsById.get(appointment.client_id);
          const status = STATUS_META[appointment.status];

          return (
            <button
              key={domId}
              type="button"
              onClick={() => onSelectItem(domId)}
              className={cn(
                "absolute right-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm",
                status.className,
              )}
              style={{
                left: LABEL_OFFSET_PX,
                top,
                height,
                borderLeftColor: service?.cor ?? "#7C3AED",
              }}
            >
              <p className="truncate font-semibold">
                {formatInTimeZone(new Date(appointment.inicio), timezone, "HH:mm")} ·{" "}
                {client?.nome ?? "Cliente"}
              </p>
              {height >= 36 ? <p className="truncate opacity-80">{service?.nome ?? "Serviço"}</p> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
