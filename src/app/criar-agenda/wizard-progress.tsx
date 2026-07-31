import { cn } from "@/lib/utils";

const ETAPAS = ["Conta", "Loja", "Categoria", "Foto", "Disponibilidade"];

export function WizardProgress({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-1.5">
      {ETAPAS.map((etapa, index) => {
        const step = index + 1;
        const status =
          step === current ? "current" : step < current ? "done" : "upcoming";

        return (
          <li key={etapa} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                status === "current" && "bg-primary text-primary-foreground",
                status === "done" && "bg-primary/15 text-primary",
                status === "upcoming" && "bg-muted text-muted-foreground",
              )}
            >
              {step}
            </span>
            {step < ETAPAS.length ? (
              <span
                className={cn(
                  "h-px w-4 sm:w-6",
                  status === "done" ? "bg-primary/40" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
