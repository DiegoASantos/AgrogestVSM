import { describe, expect, it } from "vitest";

import { formatCropAge } from "./crop-age";

describe("formatCropAge", () => {
  it.each([
    ["2024-05-20", "2026-08-19", "2 años, 2 meses"],
    ["2024-05-20", "2026-08-20", "2 años, 3 meses"],
    ["2024-02-29", "2025-02-28", "0 años, 11 meses"],
    ["2025-09-01", "2025-09-01", "0 años, 0 meses"],
    ["2025-09-01", "2026-10-01", "1 año, 1 mes"]
  ])("calculates complete calendar months from %s to %s", (sowing, visit, expected) => {
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
