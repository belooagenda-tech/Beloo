"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COR_AVULSO, COR_PLANO } from "../colors";
import { FinanceTooltip } from "./chart-tooltip";
import type { PeriodBucket } from "../types";

export function RevenueByPeriodChart({ data }: { data: PeriodBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Faturamento por período</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento registrado nesse período.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap={6}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                width={40}
              />
              <Tooltip content={FinanceTooltip} cursor={{ fill: "var(--muted)" }} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              <Bar
                dataKey="avulso"
                name="Avulso"
                stackId="faturamento"
                fill={COR_AVULSO}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={24}
              />
              <Bar
                dataKey="plano"
                name="Plano"
                stackId="faturamento"
                fill={COR_PLANO}
                stroke="var(--card)"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
