import type { EstimateReportFilters } from "../types/reportes.types";

export function currentYearEstimateReportFilters(
  now = new Date()
): EstimateReportFilters {
  const currentDate = dateInLima(now);
  const year = currentDate.slice(0, 4);
  const range = normalizeEstimateReportRange(`${year}-01-01`, currentDate);

  return {
    agronomistUserId: "",
    startDate: range.startDate,
    endDate: range.endDate
  };
}

export function normalizeEstimateReportRange(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const startIsoDay = start.getUTCDay() || 7;
  const endIsoDay = end.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - (startIsoDay - 1));
  end.setUTCDate(end.getUTCDate() + (7 - endIsoDay));

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(parseDate(value));
}

export function formatVariation(value: number | null) {
  if (value === null) return "No aplica";
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}%`;
}

export function formatIsoWeekLabel(weekNumber: number, isoYear: number) {
  return `S${weekNumber}·${String(isoYear).slice(-2)}`;
}

export function variationTone(value: number | null) {
  if (value === null || value === 0) return "neutral" as const;
  return value > 0 ? ("positive" as const) : ("negative" as const);
}

function dateInLima(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Lima"
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
