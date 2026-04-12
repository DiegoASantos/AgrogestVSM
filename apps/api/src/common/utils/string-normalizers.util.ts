export function trimRequiredString(value: unknown): string {
  return String(value ?? "").trim();
}

export function trimOptionalString(
  value: unknown
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = String(value ?? "").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function trimOptionalLowercaseString(
  value: unknown
): string | null | undefined {
  const normalizedValue = trimOptionalString(value);

  return typeof normalizedValue === "string"
    ? normalizedValue.toLowerCase()
    : normalizedValue;
}

export function trimOptionalUppercaseString(
  value: unknown
): string | null | undefined {
  const normalizedValue = trimOptionalString(value);

  return typeof normalizedValue === "string"
    ? normalizedValue.toUpperCase()
    : normalizedValue;
}
