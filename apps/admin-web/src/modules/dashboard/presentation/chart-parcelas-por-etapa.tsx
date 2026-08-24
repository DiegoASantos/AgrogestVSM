"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { currentMonthRange } from "./chart-visitas-por-agronomo";
import type {
  DashboardParcelasPorEtapaFilters,
  EtapaFenologicaDashboardOption,
  ParcelasPorEtapa
} from "../types/dashboard.types";

type Props = {
  data: ParcelasPorEtapa[];
  etapas: EtapaFenologicaDashboardOption[];
  errorMessage: string | null;
  filters: DashboardParcelasPorEtapaFilters;
  isLoading: boolean;
  onApply: (filters: DashboardParcelasPorEtapaFilters) => void;
};

export function ChartParcelasPorEtapa({
  data,
  etapas,
  errorMessage,
  filters,
  isLoading,
  onApply
}: Props) {
  const [draft, setDraft] = useState(filters);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => setDraft(filters), [filters]);

  function apply() {
    if (draft.startDate > draft.endDate) {
      setValidationError("La fecha hasta debe ser mayor o igual a la fecha desde.");
      return;
    }

    setValidationError(null);
    onApply(draft);
  }

  function clear() {
    setValidationError(null);
    onApply({ ...currentMonthRange(), phenologicalStageId: "" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Parcelas por etapa fenológica
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Estado de la última visita activa de cada parcela en el rango seleccionado.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="field-group">
          <span className="field-group__label">Fecha desde</span>
          <input
            onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
            type="date"
            value={draft.startDate}
          />
        </label>
        <label className="field-group">
          <span className="field-group__label">Fecha hasta</span>
          <input
            onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            type="date"
            value={draft.endDate}
          />
        </label>
        <label className="field-group sm:col-span-2">
          <span className="field-group__label">Etapa o labor</span>
          <select
            onChange={(event) =>
              setDraft({ ...draft, phenologicalStageId: event.target.value })
            }
            value={draft.phenologicalStageId}
          >
            <option value="">Todas</option>
            {etapas.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.name} ({etapa.type})
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={clear}
            type="button"
          >
            Limpiar
          </button>
          <button
            className="ui-button ui-button--primary ui-button--compact"
            onClick={apply}
            type="button"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
      {validationError ? <p className="form-error">{validationError}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gráfico...</p>
      ) : null}
      {!isLoading && !errorMessage && data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay parcelas con etapa en este rango.
        </p>
      ) : null}
      {!isLoading && !errorMessage && data.length > 0 ? (
        <ResponsiveContainer height={Math.max(220, data.length * 48)} width="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 18 }}>
            <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              dataKey="count"
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              type="category"
              width={135}
            />
            <Tooltip content={<ParcelasTooltip />} />
            <Bar
              dataKey="count"
              fill="var(--chart-2)"
              name="Parcelas"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

function ParcelasTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload?: ParcelasPorEtapa }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="max-w-xs rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <p className="font-semibold">
        {item.name} ({item.type})
      </p>
      <p className="mt-1">
        {item.count} parcela{item.count === 1 ? "" : "s"}
      </p>
      <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-4">
        {item.parcelas.map((parcela) => (
          <li key={parcela}>{parcela}</li>
        ))}
      </ul>
    </div>
  );
}
