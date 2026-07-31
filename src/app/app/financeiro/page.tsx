import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Financeiro" };

export default function FinanceiroPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Relatórios financeiros chegam em breve"
      description="Faturamento avulso, faturamento de planos e filtros por período serão exibidos aqui."
    />
  );
}
