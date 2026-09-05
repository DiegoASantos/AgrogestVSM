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

import type { EnfermedadFrecuente } from "../types/dashboard.types";

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--chart-2)"
];

export function ChartEnfermedadesFrecuentes({
  data
}: {
  data: EnfermedadFrecuente[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Enfermedades más frecuentes</h3>
      {data.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          Sin enfermedades registradas.
        </div>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              className="text-xs text-muted-foreground"
              dataKey="enfermedad"
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
                <Cell fill={BAR_COLORS[index % BAR_COLORS.length]} key={item.enfermedad} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
