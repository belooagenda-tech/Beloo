import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Planos" };

export default function PlanosPage() {
  return (
    <ComingSoon
      icon={Repeat}
      title="Planos para seus clientes chegam em breve"
      description="Crie pacotes recorrentes, como 'Unha em Dia — R$140/mês', para vender aos seus clientes."
    />
  );
}
