import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assinatura" };

async function getSubStatus(slug: string, subId: string) {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("client_plan_subs")
    .select("id, plan_id, pagamento_status")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return null;

  const { data: plan } = await supabase
    .from("client_plans")
    .select("nome, business_id")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("nome_loja, slug")
    .eq("id", plan.business_id)
    .maybeSingle();
  if (!business || business.slug !== slug) return null;

  return { sub, plan, business };
}

export default async function PlanoConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { slug } = await params;
  const { sub: subId } = await searchParams;
  if (!subId) notFound();

  const data = await getSubStatus(slug, subId);
  if (!data) notFound();

  const { plan, business, sub } = data;
  const ativo = sub.pagamento_status === "ativo";

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-secondary/60 via-background to-background">
      <header className="flex items-center px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm text-center">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10">
              <div
                className={`flex size-12 items-center justify-center rounded-full ${ativo ? "bg-success/15" : "bg-secondary"}`}
              >
                {ativo ? (
                  <CalendarCheck className="size-6 text-success" />
                ) : (
                  <Clock className="size-6 text-muted-foreground" />
                )}
              </div>
              <h1 className="font-heading text-lg font-semibold text-foreground">
                {ativo ? "Assinatura confirmada!" : "Estamos confirmando seu pagamento"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {plan.nome} com <strong>{business.nome_loja}</strong>
              </p>
              {!ativo ? (
                <p className="text-xs text-muted-foreground">
                  Isso pode levar alguns instantes. O profissional vai confirmar
                  assim que o pagamento cair.
                </p>
              ) : null}
              <Button
                className="mt-2 w-full"
                nativeButton={false}
                render={<Link href={`/${slug}`}>Voltar para a loja</Link>}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
