import { describe, expect, it } from "vitest";

import {
  forecastReadingsForDate,
  limaDateKeyAtOffset,
  mergeHistoryByTimestamp
} from "./clima-view.utils";

describe("climate view utilities", () => {
  it("selects daily forecast variables without treating them as current readings", () => {
    const readings = forecastReadingsForDate(
      [
        {
          variable: "temperature_2m_max",
          value: 35,
          unit: "°C",
          validAt: "2026-08-11T12:00:00-05:00"
        },
        {
          variable: "precipitation_sum",
          value: 4,
          unit: "mm",
          validAt: "2026-08-12T12:00:00-05:00"
        }
      ],
      "2026-08-11"
    );

    expect(readings).toEqual([
      expect.objectContaining({
        variable: "temperature_2m_max",
        value: 35,
        type: "PRONOSTICADO"
      })
    ]);
  });

  it("calculates date tabs in America/Lima instead of the browser timezone", () => {
    expect(limaDateKeyAtOffset(0, new Date("2026-08-11T03:00:00Z"))).toBe("2026-08-10");
    expect(limaDateKeyAtOffset(1, new Date("2026-08-11T03:00:00Z"))).toBe("2026-08-11");
  });

  it("orders historical readings and merges variables sharing a timestamp", () => {
    const rows = mergeHistoryByTimestamp(
      [
        {
          variable: "temperature_2m",
          value: 31,
          unit: "°C",
          type: "ESTIMADO",
          dataAt: "2026-08-10T12:00:00Z",
          receivedAt: "2026-08-10T12:00:00Z"
        },
        {
          variable: "relative_humidity_2m",
          value: 70,
          unit: "%",
          type: "ESTIMADO",
          dataAt: "2026-08-10T12:00:00Z",
          receivedAt: "2026-08-10T12:00:00Z"
        },
        {
          variable: "temperature_2m",
          value: 29,
          unit: "°C",
          type: "ESTIMADO",
          dataAt: "2026-08-09T12:00:00Z",
          receivedAt: "2026-08-09T12:00:00Z"
        }
      ],
      ["temperature_2m", "relative_humidity_2m"]
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ temperature_2m: 29 });
    expect(rows[1]).toMatchObject({
      temperature_2m: 31,
      relative_humidity_2m: 70
    });
  });
});
