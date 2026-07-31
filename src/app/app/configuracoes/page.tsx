import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Configurações chegam em breve"
      description="Dados da loja, link público e preferências de notificação serão editáveis aqui."
    />
  );
}
