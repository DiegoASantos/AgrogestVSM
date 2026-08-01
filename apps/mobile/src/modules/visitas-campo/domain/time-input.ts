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

function sanitizePartialTimeInput(value: string) {
  const cleaned = value.replace(/[^\d:]/g, "");
  if (!cleaned.includes(":")) return cleaned.replace(/\D/g, "").slice(0, 4);

  const [hours = "", ...minutes] = cleaned.split(":");
  return `${hours.slice(0, 2)}:${minutes.join("").slice(0, 2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
