import type { ClimateForecast, ClimateReading } from "../services/clima.service";

const DAY_IN_MS = 86_400_000;
const LIMA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export function limaDateKeyAtOffset(offset: number, now = new Date()) {
  return LIMA_DATE_FORMATTER.format(new Date(now.getTime() + offset * DAY_IN_MS));
}

export function forecastReadingsForDate(
  days: ClimateForecast["days"],
  dateKey: string
): ClimateReading[] {
  return days
    .filter((day) => day.validAt.slice(0, 10) === dateKey)
    .map((day) => ({
      variable: day.variable,
      value: Number(day.value),
      unit: day.unit,
      type: "PRONOSTICADO",
      dataAt: day.validAt,
      receivedAt: day.issuedAt ?? day.validAt,
      model: day.model ?? null
    }))
    .filter((reading) => Number.isFinite(reading.value));
}

export function mergeHistoryByTimestamp(readings: ClimateReading[], variables: string[]) {
  const rows = new Map<string, Record<string, string | number>>();

  for (const reading of readings) {
    if (!variables.includes(reading.variable)) continue;
    const timestamp = new Date(reading.dataAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const key = new Date(timestamp).toISOString();
    const row = rows.get(key) ?? { timestamp: key };
    row[reading.variable] = Number(reading.value);
    rows.set(key, row);
  }

  return Array.from(rows.values()).sort(
    (left, right) =>
      new Date(String(left.timestamp)).getTime() -
      new Date(String(right.timestamp)).getTime()
  );
}
