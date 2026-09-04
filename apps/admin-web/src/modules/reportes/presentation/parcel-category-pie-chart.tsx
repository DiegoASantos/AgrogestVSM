"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ParcelCategoryDistribution } from "../types/reportes.types";
import { PARCEL_CATEGORY_COLORS } from "../utils/reportes-parcelas";

type ParcelCategoryPieChartProps = {
  data: ParcelCategoryDistribution[];
  metric: "parcels" | "hectares";
};

export function ParcelCategoryPieChart({ data, metric }: ParcelCategoryPieChartProps) {
  const chartData = data
    .filter((item) => (metric === "parcels" ? item.parcelsCount : item.hectares) > 0)
    .map((item) => ({
      ...item,
      value: metric === "parcels" ? item.parcelsCount : item.hectares,
      percentage: metric === "parcels" ? item.parcelPercentage : item.hectarePercentage
    }));

  if (chartData.length === 0) {
    return (
      <div className="parcel-category-chart__empty">
        No hay parcelas con área válida para esta distribución.
      </div>
    );
  }

  return (
    <div className="parcel-category-chart">
      <div className="parcel-category-chart__plot" aria-hidden="true">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={58}
              isAnimationActive={false}
              nameKey="name"
              outerRadius={96}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {chartData.map((item) => (
                <Cell fill={PARCEL_CATEGORY_COLORS[item.code]} key={item.code} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                metric === "parcels"
                  ? `${formatNumber(Number(value))} parcelas (${formatPercentage(
                      item.payload.percentage
                    )})`
                  : `${formatNumber(Number(value))} ha (${formatPercentage(
                      item.payload.percentage
                    )})`,
                item.payload.name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        aria-label={
          metric === "parcels"
            ? "Distribución de parcelas por categoría"
            : "Distribución de hectáreas por categoría"
        }
        className="parcel-category-chart__legend"
      >
        {data.map((item) => {
          const value = metric === "parcels" ? item.parcelsCount : item.hectares;
          const percentage =
            metric === "parcels" ? item.parcelPercentage : item.hectarePercentage;
          return (
            <li key={item.code}>
              <i
                aria-hidden="true"
                style={{ backgroundColor: PARCEL_CATEGORY_COLORS[item.code] }}
              />
              <span>{item.name}</span>
              <strong>
                {formatNumber(value)}
                {metric === "hectares" ? " ha" : ""} · {formatPercentage(percentage)}
              </strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value);
}

function formatPercentage(value: number) {
  return `${formatNumber(value)}%`;
}
