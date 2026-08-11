"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentMethodRevenue, PeriodBucket, ServiceRevenue } from "./types";

function toCsv(rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(";")).join("\r\n");
}

export function ExportCsvButton({
  periodo,
  byPeriod,
  byService,
  byFormaPagamento,
}: {
  periodo: string;
  byPeriod: PeriodBucket[];
  byService: ServiceRevenue[];
  byFormaPagamento: PaymentMethodRevenue[];
}) {
  function handleExport() {
    const linhas: string[][] = [
      ["Faturamento por período"],
      ["Data", "Avulso (R$)", "Plano (R$)"],
      ...byPeriod.map((b) => [b.rotulo, b.avulso.toFixed(2), b.plano.toFixed(2)]),
      [],
      ["Faturamento por serviço"],
      ["Serviço", "Total (R$)"],
      ...byService.map((s) => [s.nome, s.total.toFixed(2)]),
      [],
      ["Faturamento por forma de pagamento"],
      ["Forma", "Total (R$)"],
      ...byFormaPagamento.map((f) => [f.label, f.total.toFixed(2)]),
    ];

    const csv = toCsv(linhas);
    // Marca de ordem de bytes (BOM) do UTF-8 na frente do conteúdo — sem
    // isso o Excel abre a acentuação quebrada. String.fromCharCode evita
    // depender de um caractere invisível cru no código-fonte.
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${periodo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-4" />
      Exportar CSV
    </Button>
  );
}
