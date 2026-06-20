"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PlagaFrecuente } from "../types/dashboard.types";

export function ChartPlagasFrecuentes({
  data
}: {
  data: PlagaFrecuente[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Plagas mas frecuentes
      </h3>
      <ResponsiveContainer height={200} width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            className="stroke-border"
          />
          <XAxis
            axisLine={false}
            className="text-xs text-muted-foreground"
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            className="text-xs text-muted-foreground"
            dataKey="plaga"
            tickLine={false}
            type="category"
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)"
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--chart-2)"
            name="Incidencias"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
