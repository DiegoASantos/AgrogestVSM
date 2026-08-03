import { describe, expect, it } from "vitest";

import {
  getMaxReportLogicalHeight,
  getReportCaptureStartError,
  parseReportHeightMessage
} from "./report-image-sizing";

describe("HTML report image sizing", () => {
  it("accepts only valid report size messages", () => {
    expect(
      parseReportHeightMessage(
        JSON.stringify({ type: "agrogest-report-size", height: 1200.2 })
      )
    ).toBe(1201);
    expect(parseReportHeightMessage("not-json")).toBeNull();
    expect(
      parseReportHeightMessage(JSON.stringify({ type: "other", height: 100 }))
    ).toBeNull();
    expect(
      parseReportHeightMessage(
        JSON.stringify({ type: "agrogest-report-size", height: 0 })
      )
    ).toBeNull();
  });

  it("reduces the safe logical height on denser screens", () => {
    expect(getMaxReportLogicalHeight(360, 3, 14_000_000)).toBe(4320);
    expect(getMaxReportLogicalHeight(360, 2, 14_000_000)).toBe(9722);
  });

  it("prevents concurrent or abandoned native captures", () => {
    expect(getReportCaptureStartError(false, 0)).toBeNull();
    expect(getReportCaptureStartError(true, 0)).toContain("Ya se esta generando");
    expect(getReportCaptureStartError(false, 1)).toContain(
      "captura anterior sigue finalizando"
    );
  });
});
