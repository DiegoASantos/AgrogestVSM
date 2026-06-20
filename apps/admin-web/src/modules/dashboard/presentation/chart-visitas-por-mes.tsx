"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { VisitasPorMes } from "../types/dashboard.types";

function mesLabel(key: string): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  const month = Number(key.split("-")[1]) - 1;
  return months[month] ?? key;
}

export function ChartVisitasPorMes({
  data,
  year,
  availableYears,
  onYearChange
}: {
  data: VisitasPorMes[];
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}) {
  const chartData = useMemo(
    () => data.map((d) => ({ label: mesLabel(d.mes), count: d.count })),
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Visitas por mes
        </h3>
        <Select
          value={String(year)}
          onValueChange={(v) => onYearChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer height={200} width="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            axisLine={false}
            className="text-xs text-muted-foreground"
            dataKey="label"
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
            activeDot={{ r: 4 }}
            dataKey="count"
            dot={{ r: 2 }}
            stroke="var(--primary)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
