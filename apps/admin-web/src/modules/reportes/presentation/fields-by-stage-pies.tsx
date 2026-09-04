"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type {
  FieldsByStageCatalogItem,
  FieldsByStageEngineerRow
} from "../types/reportes.types";

type FieldsByStagePiesProps = {
  engineers: FieldsByStageEngineerRow[];
  stages: FieldsByStageCatalogItem[];
  colors: Map<string, string>;
};

export function FieldsByStagePies({ engineers, stages, colors }: FieldsByStagePiesProps) {
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));

  return (
    <div className="stage-pies">
      <div className="stage-pies__legend" aria-label="Leyenda de etapas y labores">
        {stages.map((stage) => (
          <span key={stage.id}>
            <i aria-hidden="true" style={{ backgroundColor: colors.get(stage.id) }} />
            {stage.name}
          </span>
        ))}
      </div>
      <div className="stage-pies__grid">
        {engineers.map((engineer) => {
          const data = engineer.stages
            .filter((item) => item.count > 0)
            .map((item) => ({
              ...item,
              name: stageNames.get(item.stageId) ?? "Sin nombre"
            }));

          return (
            <article className="stage-pie-card" key={engineer.agronomistUserId}>
              <header>
                <div>
                  <span>Ingeniero</span>
                  <h4>{engineer.engineerName}</h4>
                </div>
                <strong>{engineer.totalParcels}</strong>
              </header>
              {data.length === 0 ? (
                <div className="stage-pie-card__empty">
                  Sin parcelas categorizadas con los filtros actuales.
                </div>
              ) : (
                <>
                  <div className="stage-pie-card__chart" aria-hidden="true">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="count"
                          innerRadius={42}
                          isAnimationActive={false}
                          nameKey="name"
                          outerRadius={70}
                          paddingAngle={2}
                          stroke="var(--surface)"
                          strokeWidth={2}
                        >
                          {data.map((item) => (
                            <Cell
                              fill={colors.get(item.stageId) ?? "#64748b"}
                              key={item.stageId}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => [
                            `${Number(value)} parcelas (${formatPercentage(
                              item.payload.percentageOfEngineer
                            )})`,
                            item.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul
                    aria-label={`Distribución de parcelas de ${engineer.engineerName}`}
                    className="stage-pie-card__breakdown"
                  >
                    {data.map((item) => (
                      <li key={item.stageId}>
                        <i
                          aria-hidden="true"
                          style={{ backgroundColor: colors.get(item.stageId) }}
                        />
                        <span>{item.name}</span>
                        <strong>
                          {item.count} · {formatPercentage(item.percentageOfEngineer)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2
  }).format(value)}%`;
}
