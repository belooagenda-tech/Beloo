import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <SearchX className="size-6 text-secondary-foreground" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Página não encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            O endereço que você acessou não existe ou foi movido.
          </p>
          <Button className="mt-2 w-full" nativeButton={false} render={<Link href="/">Voltar para o início</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}
