export const ISO_DATETIME_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/u;

export function toStrictNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}
