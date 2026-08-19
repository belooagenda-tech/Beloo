import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OnboardingStepCard({
  titulo,
  descricao,
  concluido,
  opcional = false,
  href,
  cta,
}: {
  titulo: string;
  descricao: string;
  concluido: boolean;
  opcional?: boolean;
  href?: string;
  cta?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        {concluido ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{titulo}</p>
            {concluido ? (
              <Badge variant="secondary" className="bg-success/15 text-success">
                Concluído
              </Badge>
            ) : opcional ? (
              <Badge variant="outline">Opcional</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{descricao}</p>
          {!concluido && href && cta ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              nativeButton={false}
              render={<Link href={href}>{cta}</Link>}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
