"use client";

import { useRouter } from "next/navigation";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capitalizeFirst, cn } from "@/lib/utils";

function addDiasStr(dataStr: string, dias: number) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 0 = domingo (padrão de Date#getDay()) — usado só pra achar a segunda-feira
// da semana que contém `dataStr`, em aritmética pura de string de data.
function weekdayOfStr(dataStr: string): number {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

// Único retorno visual de que o clique foi registrado enquanto a navegação
// ainda resolve no servidor — sem isso, trocar de dia parecia "travar" (a
// Agenda é uma rota dinâmica, então o prefetch do Link só antecipa o esqueleto
// de loading.tsx, não o dado em si) e profissionais impacientes clicavam
// várias vezes achando que não tinha funcionado.
function NavPendingIcon({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={cn("size-3.5 animate-spin", className)} aria-hidden="true" />;
}

// Troca o ícone da seta por um spinner enquanto a navegação pro dia
// anterior/próximo ainda resolve — mesmo princípio do NavPendingIcon acima,
// só que substituindo em vez de somando (não cabem os dois num botão só ícone).
function NavArrowIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className="size-4 animate-spin" aria-hidden="true" />;
  return <Icon className="size-4" />;
}

function DayCountOrSpinner({ qtd }: { qtd: number }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className="size-3 animate-spin" aria-hidden="true" />;
  return <>{qtd > 0 ? qtd : "—"}</>;
}

export function DayNavigator({
  businessId,
  timezone,
  dataSelecionada,
  hojeStr,
}: {
  businessId: string;
  timezone: string;
  dataSelecionada: string;
  hojeStr: string;
}) {
  const router = useRouter();
  const [contagemPorDia, setContagemPorDia] = useState<Record<string, number>>({});

  const [ano, mes, dia] = dataSelecionada.split("-").map(Number);
  const label = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(ano, mes - 1, dia)),
  );

  // Segunda-feira da semana que contém o dia selecionado, e os 7 dias dali.
  const weekday = weekdayOfStr(dataSelecionada);
  const offsetParaSegunda = weekday === 0 ? -6 : 1 - weekday;
  const inicioDaSemana = addDiasStr(dataSelecionada, offsetParaSegunda);
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => addDiasStr(inicioDaSemana, i));

  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = createClient();
      const inicio = fromZonedTime(`${inicioDaSemana}T00:00:00`, timezone);
      const fim = addDays(inicio, 7);
      const { data } = await supabase
        .from("appointments")
        .select("inicio")
        .eq("business_id", businessId)
        .neq("status", "cancelado")
        .gte("inicio", inicio.toISOString())
        .lt("inicio", fim.toISOString());
      if (!ativo) return;
      const contagem: Record<string, number> = {};
      for (const row of data ?? []) {
        const diaStr = formatInTimeZone(new Date(row.inicio), timezone, "yyyy-MM-dd");
        contagem[diaStr] = (contagem[diaStr] ?? 0) + 1;
      }
      setContagemPorDia(contagem);
    })();
    return () => {
      ativo = false;
    };
  }, [businessId, timezone, inicioDaSemana]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {/* Link puro estilizado com buttonVariants em vez do componente
              Button — o par Button(render=Link)+filhos separados do Base UI
              causa mismatch de hidratação (SSR usa <a>, cliente cai pra
              <button> ignorando nativeButton). Ver commit desta correção. */}
          <Link
            href={`/app/agenda?data=${addDiasStr(dataSelecionada, -1)}`}
            aria-label="Dia anterior"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <NavArrowIcon icon={ChevronLeft} />
          </Link>
          <Link
            href={`/app/agenda?data=${addDiasStr(dataSelecionada, 1)}`}
            aria-label="Próximo dia"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <NavArrowIcon icon={ChevronRight} />
          </Link>
          <p className="ml-1 text-sm font-medium text-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          {dataSelecionada !== hojeStr ? (
            <Link
              href={`/app/agenda?data=${hojeStr}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Hoje
              <NavPendingIcon />
            </Link>
          ) : null}
          <Input
            type="date"
            value={dataSelecionada}
            onChange={(e) => e.target.value && router.push(`/app/agenda?data=${e.target.value}`)}
            className="w-auto"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {diasDaSemana.map((data) => {
          const [y, m, d] = data.split("-").map(Number);
          const diaSemanaLabel = capitalizeFirst(
            new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
              .format(new Date(y, m - 1, d))
              .replace(".", ""),
          );
          const ativo = data === dataSelecionada;
          const ehHoje = data === hojeStr;
          const qtd = contagemPorDia[data] ?? 0;

          return (
            <Link
              key={data}
              href={`/app/agenda?data=${data}`}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                ativo
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <span className={cn("font-medium", !ativo && ehHoje && "text-primary")}>
                {diaSemanaLabel}
              </span>
              <span className={cn("text-sm font-semibold", ativo ? "text-secondary-foreground" : "text-foreground")}>
                {d}
              </span>
              <span className="flex h-3 items-center justify-center text-[10px] text-muted-foreground">
                <DayCountOrSpinner qtd={qtd} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
