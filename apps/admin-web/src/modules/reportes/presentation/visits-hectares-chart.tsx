"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { VisitReportTimelinePoint } from "../types/reportes.types";

export function VisitsHectaresChart({ data }: { data: VisitReportTimelinePoint[] }) {
  return (
    <figure aria-label="Hectáreas observadas y visitas por día" className="report-chart">
      <div aria-hidden="true">
        <ResponsiveContainer height={340} width="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 8, top: 16 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="visitDate"
              tickFormatter={formatShortDate}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              dataKey="hectares"
              name="Hectáreas"
              tickLine={false}
              width={42}
              yAxisId="hectares"
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              dataKey="visitsCount"
              name="Visitas"
              orientation="right"
              tickLine={false}
              width={34}
              yAxisId="visits"
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => formatLongDate(String(label))}
            />
            <Legend />
            <Bar
              dataKey="hectares"
              fill="var(--chart-1)"
              fillOpacity={0.88}
              name="Hectáreas observadas"
              radius={[7, 7, 0, 0]}
              yAxisId="hectares"
            />
            <Line
              activeDot={{ fill: "var(--chart-4)", r: 6, strokeWidth: 0 }}
              dataKey="visitsCount"
              dot={{ fill: "var(--chart-4)", r: 3.5, strokeWidth: 0 }}
              name="Visitas"
              stroke="var(--chart-4)"
              strokeWidth={3}
              type="monotone"
              yAxisId="visits"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Datos diarios de hectáreas observadas y visitas</caption>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hectáreas</th>
            <th>Visitas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.visitDate}>
              <td>{formatLongDate(item.visitDate)}</td>
              <td>{item.hectares}</td>
              <td>{item.visitsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)"
};

function formatShortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}
