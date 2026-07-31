"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatarRotuloDia(dateStr: string) {
  const [ano, mes, dia] = dateStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const formatado = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(data);
  return formatado.replace(".", "");
}

export function DayTimePicker({
  slots,
  timezone,
  loading,
  onSelect,
  onBack,
}: {
  slots: Record<string, string[]>;
  timezone: string;
  loading: boolean;
  onSelect: (isoInicio: string) => void;
  onBack: () => void;
}) {
  const dates = Object.keys(slots).sort();
  const [manuallySelectedDate, setManuallySelectedDate] = useState<string | null>(null);
  const selectedDate =
    manuallySelectedDate && dates.includes(manuallySelectedDate)
      ? manuallySelectedDate
      : (dates[0] ?? null);

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Trocar serviço
      </Button>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Buscando horários disponíveis...
        </div>
      ) : dates.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum horário disponível nos próximos dias. Tente novamente mais tarde.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setManuallySelectedDate(date)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  date === selectedDate
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                )}
              >
                {formatarRotuloDia(date)}
              </button>
            ))}
          </div>

          {selectedDate ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots[selectedDate].map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelect(iso)}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-secondary"
                >
                  {formatInTimeZone(new Date(iso), timezone, "HH:mm")}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
