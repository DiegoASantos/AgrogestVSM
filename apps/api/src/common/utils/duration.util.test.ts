import { describe, expect, it } from "vitest";

import { durationToMilliseconds } from "./duration.util";

describe("durationToMilliseconds", () => {
  it("converts supported duration units", () => {
    expect(durationToMilliseconds("15m")).toBe(15 * 60 * 1000);
    expect(durationToMilliseconds("30d")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("rejects unsupported durations", () => {
    expect(() => durationToMilliseconds("one month")).toThrow(
      "Unsupported duration"
    );
  });
});
