import { describe, expect, it } from "vitest";

import { formatShortDate } from "./date.helpers";

describe("formatShortDate", () => {
  it("formats a Date as dd/mm/yyyy digits with es-PE by default", () => {
    // Use a local-time Date (not a UTC ISO string) to avoid TZ drift on the
    // test machine; we only assert that the expected digits appear.
    const result = formatShortDate(new Date(2025, 2, 15)); // 15 Mar 2025 local
    expect(result).toMatch(/15/);
    expect(result).toMatch(/03/);
    expect(result).toMatch(/2025/);
  });

  it("returns empty string for invalid dates", () => {
    expect(formatShortDate("not-a-date")).toBe("");
  });

  it("formats date-only strings without UTC timezone drift", () => {
    const result = formatShortDate("2026-06-01");

    expect(result).toMatch(/01/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/2026/);
  });

  it("accepts a Date instance", () => {
    const result = formatShortDate(new Date("2025-01-01T12:00:00Z"));
    expect(result).toMatch(/2025/);
  });
});
