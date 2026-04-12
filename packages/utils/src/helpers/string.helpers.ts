export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
