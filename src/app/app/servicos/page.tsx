import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Serviços" };

export default function ServicosPage() {
  return (
    <ComingSoon
      icon={Scissors}
      title="Cadastro de serviços chega em breve"
      description="Nome, duração, preço e buffer de cada serviço serão configurados aqui numa próxima etapa."
    />
  );
}
