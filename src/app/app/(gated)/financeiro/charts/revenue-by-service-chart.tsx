"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceTooltip } from "./chart-tooltip";
import type { ServiceRevenue } from "../types";

function formatarPrecoCompacto(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function RevenueByServiceChart({ data }: { data: ServiceRevenue[] }) {
  const altura = Math.max(120, data.length * 36 + 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Faturamento por serviço</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento registrado nesse período.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={altura}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                tickLine={false}
                axisLine={false}
                width={110}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip content={FinanceTooltip} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="total" name="Faturamento" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(value: number | string | boolean | null | undefined) =>
                    formatarPrecoCompacto(Number(value))
                  }
                  fill="var(--foreground)"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
