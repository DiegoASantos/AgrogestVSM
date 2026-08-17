import { describe, expect, it } from "vitest";

import { REPORT_IMAGE_MAX_PAGE_HEIGHT } from "./report-config";
import {
  getMaxReportLogicalHeight,
  getReportPageSlices,
  getReportCaptureStartError,
  parseReportPageReadyMessage,
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

  it("covers the full report without adding a blank trailing page", () => {
    expect(getReportPageSlices(3000, 1500)).toEqual([
      { height: 1500, offsetY: 0 },
      { height: 1500, offsetY: 1500 }
    ]);
    expect(getReportPageSlices(3001, 1500)).toEqual([
      { height: 1500, offsetY: 0 },
      { height: 1500, offsetY: 1500 },
      { height: 1, offsetY: 3000 }
    ]);
    expect(getReportPageSlices(0, 1500)).toEqual([]);
  });

  it("splits tall reports into readable images without losing content", () => {
    const pages = getReportPageSlices(2500, REPORT_IMAGE_MAX_PAGE_HEIGHT);

    expect(pages).toEqual([
      { height: 1080, offsetY: 0 },
      { height: 1080, offsetY: 1080 },
      { height: 340, offsetY: 2160 }
    ]);
    expect(pages.reduce((total, page) => total + page.height, 0)).toBe(2500);
  });

  it("accepts page readiness only for a concrete render", () => {
    expect(
      parseReportPageReadyMessage(
        JSON.stringify({
          type: "agrogest-report-page-ready",
          renderId: 3,
          hasContent: true
        })
      )
    ).toEqual({ renderId: 3, hasContent: true });
    expect(
      parseReportPageReadyMessage(
        JSON.stringify({
          type: "agrogest-report-page-ready",
          renderId: 0,
          hasContent: true
        })
      )
    ).toBeNull();
    expect(parseReportPageReadyMessage("not-json")).toBeNull();
  });
});
