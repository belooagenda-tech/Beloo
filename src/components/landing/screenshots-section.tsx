import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Check, Clock, PlayCircle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

function ScreenFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:w-44">
      <div className="flex items-center gap-1 border-b border-border px-2.5 py-2">
        <span className="size-1.5 rounded-full bg-destructive/40" />
        <span className="size-1.5 rounded-full bg-warning/50" />
        <span className="size-1.5 rounded-full bg-success/50" />
        <span className="ml-1 truncate text-[9px] text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </div>
  );
}

const PASSOS = [
  {
    legenda: "1. Cliente acessa o link",
    screen: (
      <ScreenFrame label="beloo.app/loja">
        <div className="h-6 w-6 rounded-full bg-primary/20" />
        <div className="h-2 w-3/4 rounded bg-foreground/10" />
        <div className="h-2 w-1/2 rounded bg-foreground/10" />
        <div className="mt-2 h-6 w-full rounded-md bg-primary" />
      </ScreenFrame>
    ),
  },
  {
    legenda: "2. Escolhe o serviço",
    screen: (
      <ScreenFrame label="Serviços">
        {["Corte", "Manicure", "Sobrancelha"].map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[9px] ${
              i === 0 ? "border-primary bg-secondary text-secondary-foreground" : "border-border text-muted-foreground"
            }`}
          >
            <Scissors className="size-3 shrink-0" />
            {s}
          </div>
        ))}
      </ScreenFrame>
    ),
  },
  {
    legenda: "3. Escolhe o horário",
    screen: (
      <ScreenFrame label="Horários">
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Calendar className="size-3" /> Terça-feira
        </div>
        <div className="grid grid-cols-3 gap-1">
          {["09:00", "10:30", "13:00", "14:00", "15:30", "16:00"].map((h, i) => (
            <div
              key={h}
              className={`rounded-md border px-1 py-1 text-center text-[8px] ${
                i === 2 ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
              }`}
            >
              {h}
            </div>
          ))}
        </div>
      </ScreenFrame>
    ),
  },
  {
    legenda: "4. Confirma os dados",
    screen: (
      <ScreenFrame label="Confirmar">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <Clock className="size-3" /> Ter, 13:00 · Manicure
        </div>
        <div className="h-2 w-full rounded bg-foreground/10" />
        <div className="h-5 w-full rounded-md border border-border" />
        <div className="mt-1 h-6 w-full rounded-md bg-primary" />
      </ScreenFrame>
    ),
  },
  {
    legenda: "5. Recebe a confirmação",
    screen: (
      <ScreenFrame label="Confirmado">
        <div className="flex flex-col items-center gap-1.5 py-2 text-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-4" />
          </span>
          <p className="text-[9px] font-medium text-foreground">Agendamento confirmado!</p>
          <p className="text-[8px] text-muted-foreground">Terça, 13:00</p>
        </div>
      </ScreenFrame>
    ),
  },
];

export function ScreenshotsSection() {
  return (
    <section className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Veja como é fácil marcar um horário
          </h2>
          <p className="mt-3 text-muted-foreground">
            A mesma experiência que seus clientes vão ter, do primeiro clique até a confirmação.
          </p>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 overflow-x-auto pb-4 sm:gap-3">
          {PASSOS.map((passo, index) => (
            <div key={passo.legenda} className="flex shrink-0 items-center gap-2 sm:gap-3">
              {passo.screen}
              {index < PASSOS.length - 1 ? (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-center text-xs text-muted-foreground">
          {PASSOS.map((passo) => (
            <span key={passo.legenda}>{passo.legenda}</span>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/demo">
                <PlayCircle className="size-4" />
                Testar agendamento de exemplo
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
