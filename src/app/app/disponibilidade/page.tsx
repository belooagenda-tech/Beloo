import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Disponibilidade" };

export default function DisponibilidadePage() {
  return (
    <ComingSoon
      icon={Clock}
      title="Edição de disponibilidade chega em breve"
      description="Você já configurou seus horários iniciais no cadastro. Ajustá-los por aqui será possível numa próxima etapa."
    />
  );
}
