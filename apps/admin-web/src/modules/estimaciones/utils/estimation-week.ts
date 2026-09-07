import type { EstimationWeekData, SaveWeekEstimate } from "../types/estimaciones.types";

export function currentWeekStart(now = new Date()) {
  const localDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return normalizeWeekStart(localDate.toISOString().slice(0, 10));
}

export function normalizeWeekStart(value: string) {
  const date = parseDate(value);
  const isoDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (isoDay - 1));
  return formatDate(date);
}

export function shiftWeek(value: string, weeks: number) {
  const date = parseDate(normalizeWeekStart(value));
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return formatDate(date);
}

export function formatWeekRange(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const fullFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const dayMonthFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  });

  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return `${start.getUTCDate()} — ${fullFormatter.format(end)}`;
  }

  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${dayMonthFormatter.format(start)} — ${fullFormatter.format(end)}`;
  }

  return `${fullFormatter.format(start)} — ${fullFormatter.format(end)}`;
}

export function createEstimateDrafts(data: EstimationWeekData) {
  return Object.fromEntries(
    data.rows.map((row) => [
      row.agronomistUserId,
      row.estimatedVisits === null ? "" : String(row.estimatedVisits)
    ])
  );
}

export function buildEstimateChanges(
  data: EstimationWeekData,
  drafts: Record<string, string>
): SaveWeekEstimate[] {
  return data.rows.flatMap((row) => {
    if (!row.isEditable) return [];

    const rawValue = drafts[row.agronomistUserId] ?? "";
    const nextValue = rawValue === "" ? null : Number(rawValue);
    if (nextValue === row.estimatedVisits) return [];

    return [
      {
        agronomoUsuarioId: row.agronomistUserId,
        visitasEstimadas: nextValue
      }
    ];
  });
}

export function validateEstimateDrafts(
  data: EstimationWeekData,
  drafts: Record<string, string>
) {
  for (const row of data.rows) {
    if (!row.isEditable) continue;
    const value = drafts[row.agronomistUserId] ?? "";
    if (value !== "" && !/^\d+$/.test(value)) {
      return `Ingresa una cantidad entera no negativa para ${row.engineerName}.`;
    }
  }

  return null;
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || formatDate(date) !== value) {
    throw new Error("Invalid ISO date.");
  }
  return date;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
