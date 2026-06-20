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
import type { DeficienciaNutriente } from "../types/dashboard.types";

const BAR_COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)"];

export function ChartDeficienciasNutrientes({ data }: { data: DeficienciaNutriente[] }) {
  const topDeficiencias = data.slice(0, 3);
  const total = topDeficiencias.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Deficiencias de nutrientes
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Top 3, agrupado solo por nombre.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {total} registros
        </span>
      </div>

      {topDeficiencias.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          Sin deficiencias registradas.
        </div>
      ) : (
        <>
          <ResponsiveContainer height={190} width="100%">
            <BarChart data={topDeficiencias} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                className="stroke-border"
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
                dataKey="nutriente"
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
              <Bar dataKey="count" name="Evaluaciones" radius={[0, 5, 5, 0]}>
                {topDeficiencias.map((item, index) => (
                  <Cell
                    fill={BAR_COLORS[index] ?? "var(--chart-3)"}
                    key={item.nutriente}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="grid gap-2 sm:grid-cols-3">
            {topDeficiencias.map((item, index) => (
              <div
                className="rounded-md border border-border/70 bg-muted/25 px-3 py-2"
                key={item.nutriente}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  #{index + 1}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {item.nutriente}
                </p>
                <p className="text-xs text-muted-foreground">{item.count} evaluaciones</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
