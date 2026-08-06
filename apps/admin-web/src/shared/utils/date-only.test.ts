import { describe, expect, it } from "vitest";

import { formatDateOnly, parseDateOnly } from "./date-only";

describe("parseDateOnly", () => {
  it("should parse valid YYYY-MM-DD strings", () => {
    const result = parseDateOnly("2026-06-15");

    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(5);
    expect(result!.getDate()).toBe(15);
  });

  it("should return null for invalid date strings", () => {
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("abc")).toBeNull();
    expect(parseDateOnly("2026-02-30")).toBeNull();
  });

  it("should trim whitespace before parsing", () => {
    const result = parseDateOnly("  2026-06-15  ");

    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
  });

  it("should return null for invalid month 00", () => {
    expect(parseDateOnly("2026-00-01")).toBeNull();
  });

  it("should return null for invalid day 00", () => {
    expect(parseDateOnly("2026-01-00")).toBeNull();
  });

  it("should return null for non-matching format", () => {
    expect(parseDateOnly("15/06/2026")).toBeNull();
    expect(parseDateOnly("20260615")).toBeNull();
  });
});

describe("formatDateOnly", () => {
  it("should format a valid date string to locale format", () => {
    const result = formatDateOnly("2026-06-15");

    expect(result).not.toBe("2026-06-15");
    expect(result).toContain("2026");
  });

  it("should return the original value for invalid dates", () => {
    const result = formatDateOnly("not-a-date");

    expect(result).toBe("not-a-date");
  });
});
