"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PlagaFrecuente } from "../types/dashboard.types";

const BAR_COLORS = [
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-5)"
];

export function ChartPlagasFrecuentes({ data }: { data: PlagaFrecuente[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Plagas mas frecuentes</h3>
      <ResponsiveContainer height={200} width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
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
          <Bar dataKey="count" name="Incidencias" radius={[0, 4, 4, 0]}>
            {data.map((item, index) => (
              <Cell fill={BAR_COLORS[index % BAR_COLORS.length]} key={item.plaga} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
