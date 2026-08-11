import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildPlanRenewalMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import type { ExpiringPlan } from "./types";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

function diasRestantes(iso: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
}

export function ExpiringPlans({ plans, nomeLoja }: { plans: ExpiringPlan[]; nomeLoja: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planos vencendo nos próximos 7 dias</CardTitle>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nenhum plano vencendo nessa janela.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => {
              const dias = diasRestantes(plan.dataRenovacao);
              return (
                <li
                  key={plan.subId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <Link
                    href={`/app/clientes/${plan.clientId}`}
                    className="min-w-0 flex-1 transition-colors hover:text-primary"
                  >
                    <p className="truncate text-sm font-medium text-foreground">{plan.clientNome}</p>
                    <p className="text-sm text-muted-foreground">{plan.planNome}</p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {dias <= 0 ? "Vence hoje" : `${dias} dia${dias === 1 ? "" : "s"}`} ·{" "}
                      {formatarData(plan.dataRenovacao)}
                    </Badge>
                    {plan.clientTelefone ? (
                      <Button
                        size="icon-sm"
                        variant="outline"
                        nativeButton={false}
                        aria-label="Lembrar renovação no WhatsApp"
                        render={
                          <a
                            href={buildWhatsAppLink(
                              plan.clientTelefone,
                              buildPlanRenewalMessage({
                                clienteNome: plan.clientNome,
                                planoNome: plan.planNome,
                                nomeLoja,
                                dataRenovacaoFormatada: formatarData(plan.dataRenovacao),
                              }),
                            )}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
