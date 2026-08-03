import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/brand/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AutoRedirect } from "./auto-redirect";

export const metadata: Metadata = { title: "E-mail confirmado" };

export default async function EmailConfirmadoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  if (erro) {
    return (
      <AuthShell title="Não foi possível confirmar" subtitle="Vamos tentar de outro jeito.">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="size-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              Esse link pode ter expirado ou já ter sido usado. Tente entrar
              com sua senha ou comece o cadastro de novo.
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button render={<Link href="/entrar">Ir para o login</Link>} nativeButton={false} />
              <Button
                variant="outline"
                render={<Link href="/criar-agenda">Criar minha agenda</Link>}
                nativeButton={false}
              />
            </div>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="E-mail confirmado!" subtitle="Vamos continuar de onde você parou.">
      <AutoRedirect to="/criar-agenda" delayMs={2200} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sua conta está confirmada. Já vamos te levar de volta para
            terminar de configurar sua agenda.
          </p>
          <Button
            className="mt-2 w-full"
            render={<Link href="/criar-agenda">Continuar agora</Link>}
            nativeButton={false}
          />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
