import { describe, expect, it } from "vitest";

import { formatCropAge } from "./crop-age";

describe("formatCropAge", () => {
  it.each([
    ["2024-05-20", "2026-08-19", 2],
    ["2024-05-20", "2026-08-20", 2],
    ["2024-05-20", "2026-05-19", 1],
    ["2024-05-20", "2026-05-20", 2],
    ["2024-02-29", "2025-02-28", 0],
    ["2024-02-29", "2025-03-01", 1],
    ["2024-02-29", "2028-02-29", 4],
    ["2025-09-01", "2025-09-01", 0],
    ["2025-09-01", "2026-08-31", 0],
    ["2025-09-01", "2026-10-01", 1]
  ])("calculates complete calendar years from %s to %s", (sowing, visit, expected) => {
    expect(formatCropAge(sowing, visit)).toBe(expected);
  });

  it.each([
    [null, "2026-08-15"],
    ["2026-08-16", "2026-08-15"],
    ["2025-02-30", "2026-08-15"],
    ["2025-01-01", "2026-02-30"]
  ])("leaves age blank when dates are missing, invalid or reversed", (sowing, visit) => {
    expect(formatCropAge(sowing, visit)).toBe("");
  });
});
