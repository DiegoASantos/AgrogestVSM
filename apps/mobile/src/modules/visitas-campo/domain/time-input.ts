export type TimePeriod = "AM" | "PM";

export function formatEditable12HourInput(previousValue: string, nextValue: string) {
  if (nextValue.length < previousValue.length) {
    return sanitizePartialTimeInput(nextValue);
  }

  const digits = nextValue.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;

  const hourDigits = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
  const minuteDigits = digits.length === 3 ? digits.slice(1) : digits.slice(2);
  return `${pad(clamp(Number(hourDigits), 1, 12))}:${pad(
    clamp(Number(minuteDigits), 0, 59)
  )}`;
}

export function isComplete12HourInput(value: string) {
  return /^(0?[1-9]|1[0-2]):[0-5]\d$/.test(value);
}

export function normalizeTyped12HourInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (!digits) return "";
  if (digits.length <= 2) return `${format12HourPart(digits)}:00`;

  const hourDigits = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
  const minuteDigits = digits.length === 3 ? digits.slice(1) : digits.slice(2);
  return `${format12HourPart(hourDigits)}:${pad(clamp(Number(minuteDigits), 0, 59))}`;
}

export function normalize12HourTimeForApi(value: string, period: TimePeriod) {
  const normalizedValue = normalizeTyped12HourInput(value);
  if (!normalizedValue) return "";

  const [hourValue, minuteValue] = normalizedValue.split(":").map(Number);
  const hour24 =
    period === "PM" ? (hourValue % 12) + 12 : hourValue === 12 ? 0 : hourValue;
  return `${pad(hour24)}:${pad(minuteValue)}`;
}

export function formatTimeFor12HourInput(value: string): {
  time: string;
  period: TimePeriod;
} {
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/u);
  if (!match) return { time: "", period: "AM" };

  const hourValue = Number(match[1]);
  const minuteValue = Number(match[2]);
  if (hourValue > 23 || minuteValue > 59) return { time: "", period: "AM" };

  const period: TimePeriod = hourValue >= 12 ? "PM" : "AM";
  return {
    time: `${pad(hourValue % 12 || 12)}:${pad(minuteValue)}`,
    period
  };
}

export function resolveInitialEndVisitTime(existing: string | null, now: Date) {
  const trimmed = existing?.trim() ?? "";
  if (/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function validateVisitEndTime(startVisitTime: string, endVisitTime: string) {
  const normalizedStart = startVisitTime.trim().slice(0, 5);
  const normalizedEnd = endVisitTime.trim().slice(0, 5);

  if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(normalizedEnd)) {
    return "La hora de fin es obligatoria y debe tener un formato valido.";
  }
  if (
    /^([01]\d|2[0-3]):[0-5]\d$/u.test(normalizedStart) &&
    normalizedEnd < normalizedStart
  ) {
    return "La hora de fin no puede ser anterior a la hora de inicio.";
  }
  return null;
}

function sanitizePartialTimeInput(value: string) {
  const cleaned = value.replace(/[^\d:]/g, "");
  if (!cleaned.includes(":")) return cleaned.replace(/\D/g, "").slice(0, 4);

  const [hours = "", ...minutes] = cleaned.split(":");
  return `${hours.slice(0, 2)}:${minutes.join("").slice(0, 2)}`;
}

function format12HourPart(value: string) {
  return pad(clamp(Number(value), 1, 12));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
