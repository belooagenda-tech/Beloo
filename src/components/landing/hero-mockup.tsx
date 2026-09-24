import { CalendarCheck2, Check, CheckCheck } from "lucide-react";

const AGENDAMENTOS = [
  { hora: "09:00", cliente: "Ana Paula", servico: "Manicure simples", cor: "#7C3AED", status: "Confirmado" },
  { hora: "10:30", cliente: "Beatriz Lima", servico: "Alongamento em gel", cor: "#FB7185", status: "Agendado" },
  { hora: "13:00", cliente: "Camila Reis", servico: "Spa dos pés", cor: "#10B981", status: "Concluído" },
  { hora: "15:30", cliente: "Duda Farias", servico: "Pé e mão", cor: "#F59E0B", status: "Agendado" },
];

// Par de mockups lado a lado (agenda + confirmação estilo chat) — mesmo
// enquadramento "celular + conversa" que produtos de agendamento/pedido
// costumam usar pra mostrar os dois lados da experiência: o profissional
// organizando o dia, e a confirmação que o cliente recebe.
export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-primary/25 via-coral/20 to-transparent blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-end justify-center gap-3 sm:gap-4">
        <div className="w-[60%] overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="size-2.5 rounded-full bg-destructive/40" />
            <span className="size-2.5 rounded-full bg-warning/50" />
            <span className="size-2.5 rounded-full bg-success/50" />
            <span className="ml-2 truncate text-xs text-muted-foreground">beloo.app/ana-nails</span>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">Hoje, terça</p>
                <p className="text-xs text-muted-foreground">4 agendamentos</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <CalendarCheck2 className="size-4" />
              </span>
            </div>

            <ul className="space-y-2.5">
              {AGENDAMENTOS.map((item) => (
                <li
                  key={item.hora}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5"
                >
                  <span className="w-10 shrink-0 text-xs font-semibold text-foreground">{item.hora}</span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.cor }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.cliente}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{item.servico}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="w-[44%] translate-y-6 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10 sm:translate-y-10">
          <div className="flex items-center gap-2 border-b border-border bg-success/10 px-3 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-success text-white">
              <Check className="size-3.5" />
            </span>
            <span className="truncate text-xs font-medium text-foreground">Ana Nails Studio</span>
          </div>
          <div className="space-y-2 p-3">
            <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-secondary px-2.5 py-2 text-[11px] text-secondary-foreground">
              Agendamento confirmado para hoje às 09:00 💅
            </div>
            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-muted px-2.5 py-2 text-[11px] text-foreground">
              Perfeita, obrigada! Até já 😊
            </div>
            <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-muted-foreground">
              09:12 <CheckCheck className="size-3 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
