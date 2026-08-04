"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capitalizeFirst } from "@/lib/utils";

function addDiasStr(dataStr: string, dias: number) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DayNavigator({
  dataSelecionada,
  hojeStr,
}: {
  dataSelecionada: string;
  hojeStr: string;
}) {
  const router = useRouter();

  function irPara(data: string) {
    router.push(`/app/agenda?data=${data}`);
  }

  const [ano, mes, dia] = dataSelecionada.split("-").map(Number);
  const label = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(ano, mes - 1, dia)),
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => irPara(addDiasStr(dataSelecionada, -1))}
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => irPara(addDiasStr(dataSelecionada, 1))}
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-4" />
        </Button>
        <p className="ml-1 text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        {dataSelecionada !== hojeStr ? (
          <Button type="button" variant="outline" size="sm" onClick={() => irPara(hojeStr)}>
            Hoje
          </Button>
        ) : null}
        <Input
          type="date"
          value={dataSelecionada}
          onChange={(e) => e.target.value && irPara(e.target.value)}
          className="w-auto"
        />
      </div>
    </div>
  );
}
