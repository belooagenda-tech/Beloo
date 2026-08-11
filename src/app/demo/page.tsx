import type { Metadata } from "next";
import { DemoBookingFlow } from "./demo-booking-flow";

export const metadata: Metadata = {
  title: "Veja como seus clientes vão agendar — demonstração",
  description: "Uma agenda pública de exemplo, com dados simulados, pra você testar exatamente como um cliente seu veria.",
};

// Página 100% estática/local — nenhum dado aqui é real nem toca o banco.
// Existe só pra deixar quem está decidindo criar uma conta viver o fluxo de
// agendamento público antes de se cadastrar.
export default function DemoPage() {
  return <DemoBookingFlow />;
}
