import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const GRATIS_ITEMS = ["1 profissional", "Até 30 agendamentos/mês", "Página pública de agendamento"];

const PRO_ITEMS = [
  "Agendamentos ilimitados",
  "Lembretes automáticos, reengajamento e lista de espera",
  "Pix automático via Mercado Pago",
  "Planos recorrentes para clientes",
  "Relatórios financeiros e QR Code",
  "Avaliações dos clientes",
];

const STUDIO_ITEMS = ["Tudo do Pro", "Múltiplos profissionais na mesma agenda"];

export function PricingSection({
  valorPro,
  valorStudio,
}: {
  valorPro: number;
  valorStudio: number;
}) {
  return (
    <section id="planos" className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Comece grátis, cresça quando quiser
          </h2>
          <p className="mt-3 text-muted-foreground">Sem taxa de adesão. Cancele quando quiser.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col rounded-3xl border border-border bg-card p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground">Grátis</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              R$ 0<span className="text-sm font-normal text-muted-foreground">/sempre</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {GRATIS_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-8"
              nativeButton={false}
              render={<Link href="/criar-agenda">Começar grátis</Link>}
            />
          </div>

          <div className="relative flex flex-col rounded-3xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Mais escolhido
            </span>
            <h3 className="font-heading text-lg font-semibold text-foreground">Pro</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {formatarPreco(valorPro)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {PRO_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-8" nativeButton={false} render={<Link href="/criar-agenda">Assinar Pro</Link>} />
          </div>

          <div className="flex flex-col rounded-3xl border border-border bg-card p-8">
            <h3 className="font-heading text-lg font-semibold text-foreground">Studio</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {formatarPreco(valorStudio)}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {STUDIO_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-8"
              nativeButton={false}
              render={<Link href="/criar-agenda">Assinar Studio</Link>}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
