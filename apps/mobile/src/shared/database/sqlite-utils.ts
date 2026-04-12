export function getNowIsoString() {
  return new Date().toISOString();
}

export function toSqliteBoolean(value: boolean) {
  return value ? 1 : 0;
}

export function fromSqliteBoolean(value: number | null | undefined) {
  return value === 1;
}

export function stringifyNullableJson(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return JSON.stringify(value);
}

export function parseNullableJson<T>(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
