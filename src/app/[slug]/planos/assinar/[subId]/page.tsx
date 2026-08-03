import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubscribeButtons } from "./subscribe-buttons";

export const metadata: Metadata = { title: "Assinar plano" };

function formatarPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function getPendingSub(slug: string, subId: string) {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("client_plan_subs")
    .select("id, plan_id, pagamento_status, pagamento_expira_em")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return null;

  const { data: plan } = await supabase
    .from("client_plans")
    .select("id, nome, valor_mensal, ciclo_dias, servicos_inclusos, business_id")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja, slug")
    .eq("id", plan.business_id)
    .maybeSingle();
  if (!business || business.slug !== slug) return null;

  const { data: services } =
    plan.servicos_inclusos.length > 0
      ? await supabase
          .from("services")
          .select("id, nome")
          .in(
            "id",
            plan.servicos_inclusos.map((i) => i.service_id),
          )
      : { data: [] };
  const servicesById = new Map((services ?? []).map((s) => [s.id, s.nome]));

  const expirado =
    sub.pagamento_status !== "pendente" ||
    Boolean(sub.pagamento_expira_em && new Date(sub.pagamento_expira_em).getTime() < Date.now());

  return { sub, plan, business, servicesById, expirado };
}

export default async function AssinarPlanoPage({
  params,
}: {
  params: Promise<{ slug: string; subId: string }>;
}) {
  const { slug, subId } = await params;
  const data = await getPendingSub(slug, subId);
  if (!data) notFound();

  const { sub, plan, business, servicesById, expirado } = data;

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <h1 className="font-heading text-xl font-semibold text-foreground">{plan.nome}</h1>
            <p className="text-sm text-muted-foreground">{business.nome_loja}</p>
          </div>

          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-lg font-semibold text-foreground">
                {formatarPreco(plan.valor_mensal)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-1">
                {plan.servicos_inclusos.map((item) => (
                  <li key={item.service_id} className="text-sm text-muted-foreground">
                    {servicesById.get(item.service_id) ?? "Serviço"}
                    {item.quantidade === null ? " · ilimitado" : ` · ${item.quantidade}x por ciclo`}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {expirado ? (
            <Alert variant="destructive">
              <AlertDescription>
                Esse link não está mais disponível. Peça um novo link ao profissional.
              </AlertDescription>
            </Alert>
          ) : (
            <SubscribeButtons slug={slug} subId={sub.id} />
          )}
        </div>
      </main>
    </div>
  );
}
