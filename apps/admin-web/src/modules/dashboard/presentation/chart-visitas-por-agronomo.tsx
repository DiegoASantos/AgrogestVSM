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

import type { DashboardDateRange, VisitasPorAgronomo } from "../types/dashboard.types";

type Props = {
  data: VisitasPorAgronomo[];
  errorMessage: string | null;
  isLoading: boolean;
  range: DashboardDateRange;
  onApply: (range: DashboardDateRange) => void;
};

export function ChartVisitasPorAgronomo({
  data,
  errorMessage,
  isLoading,
  range,
  onApply
}: Props) {
  const [draft, setDraft] = useState(range);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => setDraft(range), [range]);

  function apply() {
    if (draft.startDate > draft.endDate) {
      setValidationError("La fecha hasta debe ser mayor o igual a la fecha desde.");
      return;
    }

    setValidationError(null);
    onApply(draft);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Visitas por agrónomo</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Visitas activas registradas en el rango seleccionado.
        </p>
      </div>
      <DateRangeControls
        draft={draft}
        onChange={setDraft}
        onApply={apply}
        onClear={() => onApply(currentMonthRange())}
      />
      {validationError ? <p className="form-error">{validationError}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gráfico...</p>
      ) : null}
      {!isLoading && !errorMessage && data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay visitas en este rango.</p>
      ) : null}
      {!isLoading && !errorMessage && data.length > 0 ? (
        <ResponsiveContainer height={Math.max(220, data.length * 42)} width="100%">
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
              dataKey="agronomistName"
              tick={{ fontSize: 12 }}
              tickLine={false}
              type="category"
              width={130}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar
              dataKey="count"
              fill="var(--chart-1)"
              name="Visitas"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

export function currentMonthRange(): DashboardDateRange {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toDateInputValue(startDate), endDate: toDateInputValue(now) };
}

function DateRangeControls({
  draft,
  onChange,
  onApply,
  onClear
}: {
  draft: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="field-group">
        <span className="field-group__label">Fecha desde</span>
        <input
          onChange={(event) => onChange({ ...draft, startDate: event.target.value })}
          type="date"
          value={draft.startDate}
        />
      </label>
      <label className="field-group">
        <span className="field-group__label">Fecha hasta</span>
        <input
          onChange={(event) => onChange({ ...draft, endDate: event.target.value })}
          type="date"
          value={draft.endDate}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          className="ui-button ui-button--ghost ui-button--compact"
          onClick={onClear}
          type="button"
        >
          Limpiar
        </button>
        <button
          className="ui-button ui-button--primary ui-button--compact"
          onClick={onApply}
          type="button"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)"
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
