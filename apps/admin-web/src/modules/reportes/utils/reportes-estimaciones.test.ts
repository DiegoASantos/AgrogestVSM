import { describe, expect, it } from "vitest";

import {
  currentYearEstimateReportFilters,
  formatIsoWeekLabel,
  formatVariation,
  normalizeEstimateReportRange,
  variationTone
} from "./reportes-estimaciones";

describe("weekly estimates report utilities", () => {
  it("normalizes a range to complete Monday-Sunday weeks", () => {
    expect(normalizeEstimateReportRange("2026-09-02", "2026-09-09")).toEqual({
      startDate: "2026-08-31",
      endDate: "2026-09-13"
    });
  });

  it("starts the default range in the first week of the year", () => {
    expect(currentYearEstimateReportFilters(new Date("2026-09-07T15:00:00Z"))).toEqual({
      agronomistUserId: "",
      startDate: "2025-12-29",
      endDate: "2026-09-13"
    });
  });

  it("formats signed variation and the zero-projection state", () => {
    expect(formatVariation(20)).toBe("+20%");
    expect(formatVariation(-12.5)).toBe("−12.5%");
    expect(formatVariation(null)).toBe("No aplica");
    expect(variationTone(20)).toBe("positive");
    expect(variationTone(-1)).toBe("negative");
    expect(variationTone(null)).toBe("neutral");
  });

  it("disambiguates ISO weeks from different years on the chart axis", () => {
    expect(formatIsoWeekLabel(1, 2026)).toBe("S1·26");
    expect(formatIsoWeekLabel(52, 2025)).toBe("S52·25");
  });
});
