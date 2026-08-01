import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Você está offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo />
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
        <WifiOff className="size-6 text-secondary-foreground" />
      </div>
      <h1 className="font-heading text-lg font-semibold text-foreground">Você está offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Não foi possível carregar esta página. Verifique sua conexão e tente
        novamente.
      </p>
    </div>
  );
}
