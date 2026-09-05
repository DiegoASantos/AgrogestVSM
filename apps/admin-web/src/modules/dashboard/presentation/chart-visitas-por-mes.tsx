"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { VisitasPorMes } from "../types/dashboard.types";

function mesLabel(key: string): string {
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic"
  ];
  const month = Number(key.split("-")[1]) - 1;
  return months[month] ?? key;
}

function diaLabel(key: string): string {
  return String(Number(key.split("-")[2]));
}

export function ChartVisitasPorMes({
  data
}: {
  data: VisitasPorMes[];
}) {
  const isDaily = data.some((item) => item.mes.split("-").length === 3);
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        label: isDaily ? diaLabel(item.mes) : mesLabel(item.mes),
        count: item.count
      })),
    [data, isDaily]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {isDaily ? "Visitas por día" : "Visitas por mes"}
      </h3>
      <ResponsiveContainer height={200} width="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            className="text-xs text-muted-foreground"
            dataKey="label"
            interval={isDaily ? "preserveStartEnd" : 0}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            className="text-xs text-muted-foreground"
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)"
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Line
            activeDot={{ fill: "var(--chart-3)", r: 5, stroke: "var(--chart-1)" }}
            dataKey="count"
            dot={{ fill: "var(--chart-2)", r: 3, stroke: "var(--background)" }}
            stroke="var(--chart-1)"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
