import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const PERIODOS_VALIDOS = ["7d", "30d", "90d", "mes-atual"] as const;
export type PeriodoPreset = (typeof PERIODOS_VALIDOS)[number];

export function normalizarPeriodo(valor: string | undefined): PeriodoPreset {
  return (PERIODOS_VALIDOS as readonly string[]).includes(valor ?? "")
    ? (valor as PeriodoPreset)
    : "mes-atual";
}

function localDateAddDays(dateStr: string, dias: number) {
  const [ano, mes, dia] = dateStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolvePeriodo(periodo: PeriodoPreset, timezone: string) {
  const hojeStr = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  let deStr: string;
  if (periodo === "7d") deStr = localDateAddDays(hojeStr, -6);
  else if (periodo === "30d") deStr = localDateAddDays(hojeStr, -29);
  else if (periodo === "90d") deStr = localDateAddDays(hojeStr, -89);
  else deStr = `${hojeStr.slice(0, 7)}-01`;

  const de = fromZonedTime(`${deStr}T00:00:00`, timezone);
  const ate = fromZonedTime(`${hojeStr}T23:59:59.999`, timezone);

  return { de, ate, deStr, ateStr: hojeStr };
}
