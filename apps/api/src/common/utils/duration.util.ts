const UNIT_TO_MILLISECONDS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
} as const;

export function durationToMilliseconds(duration: string) {
  const match = /^(\d+)(ms|s|m|h|d)$/u.exec(duration.trim());

  if (!match) {
    throw new Error(`Unsupported duration: ${duration}.`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2] as keyof typeof UNIT_TO_MILLISECONDS;

  return value * UNIT_TO_MILLISECONDS[unit];
}
