import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_LABELS, minPlanFor, type PlanFeature } from "@/lib/plan/features";

// "Disponível no plano Pro/Studio" + botão de upgrade — nunca esconde uma
// feature sem explicação (pedido explícito do usuário). Envolve o card ou
// bloco que seria a feature real, no lugar dele.
export function ProFeatureGate({
  feature,
  description,
}: {
  feature: PlanFeature;
  description: string;
}) {
  const tier = minPlanFor(feature);

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Lock className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Disponível no plano {PLAN_LABELS[tier]}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href="/app/assinatura" className={buttonVariants({ size: "sm" })}>
          Fazer upgrade
        </Link>
      </CardContent>
    </Card>
  );
}
