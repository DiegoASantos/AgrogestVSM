import { describe, expect, it } from "vitest";

import {
  trimOptionalLowercaseString,
  trimOptionalString,
  trimOptionalUppercaseString,
  trimRequiredString
} from "./string-normalizers.util";

describe("trimRequiredString", () => {
  it("trims whitespace", () => {
    expect(trimRequiredString("  hello  ")).toBe("hello");
  });

  it("coerces null/undefined to empty string", () => {
    expect(trimRequiredString(null)).toBe("");
    expect(trimRequiredString(undefined)).toBe("");
  });

  it("coerces numbers", () => {
    expect(trimRequiredString(42)).toBe("42");
  });
});

describe("trimOptionalString", () => {
  it("returns undefined when value is undefined", () => {
    expect(trimOptionalString(undefined)).toBeUndefined();
  });

  it("returns null when value is empty or whitespace", () => {
    expect(trimOptionalString("")).toBeNull();
    expect(trimOptionalString("   ")).toBeNull();
    expect(trimOptionalString(null)).toBeNull();
  });

  it("returns trimmed value otherwise", () => {
    expect(trimOptionalString("  abc  ")).toBe("abc");
  });
});

describe("trimOptionalLowercaseString", () => {
  it("lowercases trimmed values", () => {
    expect(trimOptionalLowercaseString("  Hello@X.com ")).toBe("hello@x.com");
  });

  it("propagates undefined/null", () => {
    expect(trimOptionalLowercaseString(undefined)).toBeUndefined();
    expect(trimOptionalLowercaseString("")).toBeNull();
  });
});

describe("trimOptionalUppercaseString", () => {
  it("uppercases trimmed values", () => {
    expect(trimOptionalUppercaseString(" admin ")).toBe("ADMIN");
  });

  it("propagates undefined/null", () => {
    expect(trimOptionalUppercaseString(undefined)).toBeUndefined();
    expect(trimOptionalUppercaseString("   ")).toBeNull();
  });
});
