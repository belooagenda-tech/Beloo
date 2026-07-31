import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Sua agenda chega em breve"
      description="O calendário do dia a dia, com confirmação e conclusão de atendimentos, é construído numa próxima etapa."
    />
  );
}
