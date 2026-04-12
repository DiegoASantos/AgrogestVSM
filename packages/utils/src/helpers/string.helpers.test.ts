import { describe, expect, it } from "vitest";

import { getInitials, isNonEmptyString, toTitleCase } from "./string.helpers";

describe("isNonEmptyString", () => {
  it("accepts non-empty strings", () => {
    expect(isNonEmptyString("hi")).toBe(true);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
  });
});

describe("toTitleCase", () => {
  it("title-cases a single word", () => {
    expect(toTitleCase("hola")).toBe("Hola");
  });

  it("collapses multiple spaces", () => {
    expect(toTitleCase("  juan   perez  ")).toBe("Juan Perez");
  });
});

describe("getInitials", () => {
  it("returns up to two uppercase initials", () => {
    expect(getInitials("juan perez")).toBe("JP");
    expect(getInitials("maria del carmen sosa")).toBe("MD");
  });

  it("handles single-word input", () => {
    expect(getInitials("admin")).toBe("A");
  });
});
