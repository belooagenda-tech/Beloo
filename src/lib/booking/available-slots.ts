import { addMinutes, formatISO } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export type BusinessHourBlock = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type ExceptionBlock = {
  data: string;
  tipo: "folga" | "horario_especial";
  hora_inicio: string | null;
  hora_fim: string | null;
};

export type BusyAppointment = {
  inicio: string;
  fim: string;
  bufferMin: number;
};

// Bloqueio recorrente (ex.: toda segunda-feira de manhã) — diferente de
// agenda_blocks (pontual, uma data específica), aqui vale toda semana no
// mesmo dia/horário. Ver supabase/migrations/20260811000005_recurring_blocks.sql.
export type RecurringBlockRule = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type ComputeSlotsParams = {
  timezone: string;
  now: Date;
  antecedenciaMinutos: number;
  limiteDiasFuturo: number;
  duracaoMin: number;
  bufferMin: number;
  businessHours: BusinessHourBlock[];
  exceptions: ExceptionBlock[];
  busyAppointments: BusyAppointment[];
  recurringBlocks?: RecurringBlockRule[];
};

type Interval = { start: Date; end: Date };

function toHHMMSS(time: string): string {
  return time.length === 5 ? `${time}:00` : time.slice(0, 8);
}

function subtractBusy(block: Interval, busy: Interval[]): Interval[] {
  const free: Interval[] = [];
  let cursor = block.start;

  for (const interval of busy) {
    if (interval.end <= cursor || interval.start >= block.end) continue;
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start < block.end ? interval.start : block.end });
    }
    if (interval.end > cursor) cursor = interval.end;
    if (cursor >= block.end) break;
  }

  if (cursor < block.end) free.push({ start: cursor, end: block.end });

  return free;
}

function packSlots(interval: Interval, durationMin: number, bufferMin: number): Date[] {
  const slots: Date[] = [];
  let cursor = interval.start;
  const stepMs = (durationMin + bufferMin) * 60_000;
  const durationMs = durationMin * 60_000;

  while (cursor.getTime() + durationMs <= interval.end.getTime()) {
    slots.push(cursor);
    cursor = new Date(cursor.getTime() + stepMs);
  }

  return slots;
}

export function computeAvailableSlots(params: ComputeSlotsParams): Record<string, string[]> {
  const {
    timezone,
    now,
    antecedenciaMinutos,
    limiteDiasFuturo,
    duracaoMin,
    bufferMin,
    businessHours,
    exceptions,
    busyAppointments,
    recurringBlocks = [],
  } = params;

  const minStart = addMinutes(now, antecedenciaMinutos);
  const busyIntervals: Interval[] = busyAppointments
    .map((a) => ({
      start: new Date(a.inicio),
      end: addMinutes(new Date(a.fim), a.bufferMin),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const exceptionsByDate = new Map(exceptions.map((e) => [e.data, e]));
  const hoursByWeekday = new Map<number, BusinessHourBlock[]>();
  for (const hour of businessHours) {
    const list = hoursByWeekday.get(hour.dia_semana) ?? [];
    list.push(hour);
    hoursByWeekday.set(hour.dia_semana, list);
  }
  for (const list of hoursByWeekday.values()) {
    list.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }

  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const result: Record<string, string[]> = {};

  for (let offset = 0; offset <= limiteDiasFuturo; offset++) {
    const dateStr = formatInTimeZone(
      addMinutes(fromZonedTime(`${todayStr}T00:00:00`, timezone), offset * 24 * 60),
      timezone,
      "yyyy-MM-dd",
    );
    const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    const exception = exceptionsByDate.get(dateStr);

    let blocks: { hora_inicio: string; hora_fim: string }[];
    if (exception?.tipo === "folga") {
      blocks = [];
    } else if (exception?.tipo === "horario_especial" && exception.hora_inicio && exception.hora_fim) {
      blocks = [{ hora_inicio: exception.hora_inicio, hora_fim: exception.hora_fim }];
    } else {
      blocks = hoursByWeekday.get(weekday) ?? [];
    }

    // Bloqueios recorrentes que caem nesse dia da semana, já instanciados
    // como intervalos concretos desse dia — tratados como mais um "ocupado",
    // igual busyIntervals (que vem de agendamentos reais).
    const recurringBusyToday: Interval[] = recurringBlocks
      .filter((r) => r.dia_semana === weekday)
      .map((r) => ({
        start: fromZonedTime(`${dateStr}T${toHHMMSS(r.hora_inicio)}`, timezone),
        end: fromZonedTime(`${dateStr}T${toHHMMSS(r.hora_fim)}`, timezone),
      }));

    const daySlots: Date[] = [];

    for (const block of blocks) {
      const blockStart = fromZonedTime(`${dateStr}T${toHHMMSS(block.hora_inicio)}`, timezone);
      const blockEnd = fromZonedTime(`${dateStr}T${toHHMMSS(block.hora_fim)}`, timezone);
      if (blockEnd <= blockStart) continue;

      const overlappingBusy = [...busyIntervals, ...recurringBusyToday]
        .filter((b) => b.end > blockStart && b.start < blockEnd)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      const freeIntervals = subtractBusy({ start: blockStart, end: blockEnd }, overlappingBusy);

      for (const free of freeIntervals) {
        for (const slot of packSlots(free, duracaoMin, bufferMin)) {
          if (slot >= minStart) daySlots.push(slot);
        }
      }
    }

    if (daySlots.length > 0) {
      daySlots.sort((a, b) => a.getTime() - b.getTime());
      result[dateStr] = daySlots.map((slot) => formatISO(slot));
    }
  }

  return result;
}
