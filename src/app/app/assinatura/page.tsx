import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnBusiness } from "@/lib/supabase/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaasSubscriptionCard } from "./saas-subscription-card";

export const metadata: Metadata = { title: "Assinatura" };

const WHATSAPP_URL =
  "https://wa.me/5521972652314?text=" +
  encodeURIComponent("Olá! Quero saber mais sobre os planos do Beloo.");

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const business = await getOwnBusiness();

  const { data: plan } = await supabase
    .from("saas_plans")
    .select("billing_enabled, valor_mensal")
    .limit(1)
    .maybeSingle();

  if (!plan?.billing_enabled || !business) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <Sparkles className="size-6 text-secondary-foreground" />
            </div>
            <h1 className="font-heading text-lg font-semibold text-foreground">
              Grátis por enquanto!
            </h1>
            <p className="text-sm text-muted-foreground">
              A Beloo ainda não cobra assinatura. Fale com a gente se tiver
              dúvidas.
            </p>
            <Button
              className="mt-2"
              nativeButton={false}
              render={
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  Falar no WhatsApp
                </a>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: sub } = await supabase
    .from("saas_subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("business_id", business.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-md py-12">
      <SaasSubscriptionCard
        status={sub?.status ?? "trial"}
        trialEndsAt={sub?.trial_ends_at ?? new Date().toISOString()}
        currentPeriodEnd={sub?.current_period_end ?? null}
        valorMensal={plan.valor_mensal}
      />
    </div>
  );
}
