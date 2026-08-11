"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Exportar PDF" sem nenhuma biblioteca nova: usa a função de impressão do
// próprio navegador (Salvar como PDF já é uma opção padrão em todo
// navegador/impressora), com o layout do app escondido via CSS
// (`print:hidden` no cabeçalho/menu — ver app-shell.tsx) pra sobrar só o
// relatório na folha.
export function PrintReportButton() {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" />
      Exportar PDF
    </Button>
  );
}
