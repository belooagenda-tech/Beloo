import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Sua lista de clientes chega em breve"
      description="Ficha completa, histórico de agendamentos e plano ativo de cada cliente serão exibidos aqui."
    />
  );
}
