"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar esta página. Tente novamente — se o
            problema continuar, volte para o início.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button onClick={() => reset()}>Tentar novamente</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/">Voltar para o início</Link>} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
