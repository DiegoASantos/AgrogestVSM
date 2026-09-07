import { describe, expect, it } from "vitest";

import type { EstimationWeekData } from "../types/estimaciones.types";
import {
  buildEstimateChanges,
  createEstimateDrafts,
  formatWeekRange,
  normalizeWeekStart,
  shiftWeek,
  validateEstimateDrafts
} from "./estimation-week";

describe("estimation week utilities", () => {
  it("normalizes and shifts ISO weeks without local timezone drift", () => {
    expect(normalizeWeekStart("2026-09-09")).toBe("2026-09-07");
    expect(shiftWeek("2026-09-07", -1)).toBe("2026-08-31");
    expect(shiftWeek("2026-09-07", 1)).toBe("2026-09-14");
  });

  it("formats the selected week without repeating its month and year", () => {
    expect(formatWeekRange("2026-09-07", "2026-09-13")).toBe(
      "7 — 13 de setiembre de 2026"
    );
    expect(formatWeekRange("2026-08-31", "2026-09-06")).toBe(
      "31 de agosto — 6 de setiembre de 2026"
    );
  });

  it("creates drafts and sends only editable changed rows", () => {
    const data = makeWeek();
    const drafts = createEstimateDrafts(data);
    drafts["7"] = "12";
    drafts["8"] = "";
    drafts["9"] = "99";

    expect(buildEstimateChanges(data, drafts)).toEqual([
      { agronomoUsuarioId: "7", visitasEstimadas: 12 },
      { agronomoUsuarioId: "8", visitasEstimadas: null }
    ]);
  });

  it("distinguishes an empty estimate from explicit zero", () => {
    const data = makeWeek();
    const drafts = createEstimateDrafts(data);
    drafts["7"] = "";
    drafts["8"] = "0";

    expect(buildEstimateChanges(data, drafts)).toEqual([
      { agronomoUsuarioId: "7", visitasEstimadas: null },
      { agronomoUsuarioId: "8", visitasEstimadas: 0 }
    ]);
  });

  it("rejects decimal and negative draft values", () => {
    const data = makeWeek();
    expect(validateEstimateDrafts(data, { "7": "1.5", "8": "", "9": "" })).toContain(
      "Ana"
    );
    expect(validateEstimateDrafts(data, { "7": "-1", "8": "", "9": "" })).toContain(
      "Ana"
    );
    expect(validateEstimateDrafts(data, { "7": "0", "8": "", "9": "" })).toBeNull();
  });
});

function makeWeek(): EstimationWeekData {
  return {
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    totals: {
      agronomists: 3,
      withEstimate: 2,
      estimatedVisits: 15,
      actualVisits: 9,
      difference: -6
    },
    rows: [
      makeRow({ agronomistUserId: "7", engineerName: "Ana", estimatedVisits: 10 }),
      makeRow({ agronomistUserId: "8", engineerName: "Bruno", estimatedVisits: 5 }),
      makeRow({
        agronomistUserId: "9",
        engineerName: "Carla",
        isActive: false,
        isEditable: false,
        estimatedVisits: 2
      })
    ]
  };
}

function makeRow(overrides: Partial<EstimationWeekData["rows"][number]>) {
  return {
    agronomistUserId: "7",
    engineerName: "Ana",
    isActive: true,
    isEditable: true,
    estimatePublicId: "estimate-1",
    estimatedVisits: null,
    actualVisits: 0,
    difference: null,
    compliancePercentage: null,
    createdAt: null,
    updatedAt: null,
    createdByName: null,
    updatedByName: null,
    ...overrides
  };
}
