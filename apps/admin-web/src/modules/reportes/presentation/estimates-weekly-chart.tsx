"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { EstimateReportWeek } from "../types/reportes.types";
import { formatIsoWeekLabel, formatReportDate } from "../utils/reportes-estimaciones";

export function EstimatesWeeklyChart({ data }: { data: EstimateReportWeek[] }) {
  return (
    <figure
      aria-label="Visitas proyectadas y ejecutadas por semana"
      className="report-chart estimates-report-chart"
    >
      <div aria-hidden="true">
        <ResponsiveContainer height={360} width="100%">
          <LineChart data={data} margin={{ left: 0, right: 14, top: 18 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="startDate"
              minTickGap={22}
              tickFormatter={(_, index) => {
                const week = data[index];
                return week ? formatIsoWeekLabel(week.weekNumber, week.isoYear) : "";
              }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => formatWeekTooltip(String(label), data)}
            />
            <Legend />
            <Line
              activeDot={{ fill: "var(--report-leaf)", r: 6, strokeWidth: 0 }}
              dataKey="projectedVisits"
              dot={{ fill: "var(--report-leaf)", r: 3.5, strokeWidth: 0 }}
              name="Visitas proyectadas"
              stroke="var(--report-leaf)"
              strokeDasharray="7 5"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ fill: "var(--report-sand)", r: 6, strokeWidth: 0 }}
              dataKey="actualVisits"
              dot={{ fill: "var(--report-sand)", r: 3.5, strokeWidth: 0 }}
              name="Visitas ejecutadas"
              stroke="var(--report-sand)"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Datos semanales de visitas proyectadas y ejecutadas</caption>
        <thead>
          <tr>
            <th>Semana</th>
            <th>Fecha de inicio</th>
            <th>Fecha de fin</th>
            <th>Visitas proyectadas</th>
            <th>Visitas ejecutadas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((week) => (
            <tr key={week.startDate}>
              <td>{`Semana ${week.weekNumber} de ${week.isoYear}`}</td>
              <td>{formatReportDate(week.startDate)}</td>
              <td>{formatReportDate(week.endDate)}</td>
              <td>{week.projectedVisits}</td>
              <td>{week.actualVisits}</td>
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

function formatWeekTooltip(startDate: string, data: EstimateReportWeek[]) {
  const week = data.find((item) => item.startDate === startDate);
  if (!week) return startDate;
  return `Semana ${week.weekNumber} de ${week.isoYear} · ${formatReportDate(week.startDate)} al ${formatReportDate(week.endDate)}`;
}
