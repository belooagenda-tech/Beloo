import type { Metadata } from "next";
import { DemoBookingFlow } from "./demo-booking-flow";
import { CustomBlocks } from "@/components/theme/custom-blocks";

export const metadata: Metadata = {
  title: "Veja como seus clientes vão agendar — demonstração",
  description: "Uma agenda pública de exemplo, com dados simulados, pra você testar exatamente como um cliente seu veria.",
};

// Página 100% estática/local — nenhum dado real toca o banco além dos
// blocos do Editor Visual (pageKey "public-booking"). Existe pra deixar quem
// está decidindo criar uma conta viver o fluxo de agendamento público antes
// de se cadastrar — e também é o alvo do preview ao vivo do Editor pra essa
// página, já que não expõe agenda real de nenhum profissional (ver
// src/lib/layout-editor/pages.ts).
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ editorPreview?: string }>;
}) {
  const { editorPreview } = await searchParams;
  const preview = editorPreview === "1";

  return (
    <div className="space-y-4">
      <CustomBlocks pageKey="public-booking" position="before" preview={preview} />
      <DemoBookingFlow />
      <CustomBlocks pageKey="public-booking" position="after" preview={preview} />
    </div>
  );
}
