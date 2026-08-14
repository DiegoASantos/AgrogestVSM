import { describe, expect, it } from "vitest";

import {
  forecastReadingsForDate,
  filterWeatherLinkStations,
  latestReadingsByVariable,
  limaDateKeyAtOffset,
  mergeHistoryByTimestamp,
  stationHasMapCoordinates
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

  it("selects the newest valid WeatherLink reading for each variable", () => {
    const readings = latestReadingsByVariable([
      {
        variable: "temperature_2m",
        value: 31,
        unit: "°C",
        type: "OBSERVADO",
        dataAt: "2026-08-13T18:00:00Z",
        receivedAt: "2026-08-14T15:00:00Z"
      },
      {
        variable: "relative_humidity_2m",
        value: 68,
        unit: "%",
        type: "OBSERVADO",
        dataAt: "2026-08-13T20:00:00Z",
        receivedAt: "2026-08-14T15:00:00Z"
      },
      {
        variable: "temperature_2m",
        value: 29,
        unit: "°C",
        type: "OBSERVADO",
        dataAt: "2026-08-13T22:00:00Z",
        receivedAt: "2026-08-14T15:00:00Z"
      },
      {
        variable: "temperature_2m",
        value: 99,
        unit: "°C",
        type: "OBSERVADO",
        dataAt: "fecha-invalida",
        receivedAt: "2026-08-14T15:00:00Z"
      }
    ]);

    expect(readings).toHaveLength(2);
    expect(readings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variable: "temperature_2m", value: 29 }),
        expect.objectContaining({ variable: "relative_humidity_2m", value: 68 })
      ])
    );
  });

  it("excludes WeatherLink stations without complete GPS coordinates from maps", () => {
    expect(stationHasMapCoordinates({ latitude: -5.1, longitude: -80.6 })).toBe(true);
    expect(stationHasMapCoordinates({ latitude: null, longitude: -80.6 })).toBe(false);
    expect(stationHasMapCoordinates({ latitude: -5.1, longitude: null })).toBe(false);
  });

  it("filters by WeatherLink source and selected station", () => {
    const stations = [
      { id: "davis-a", sourceCode: "weatherlink", latitude: -5, longitude: -80 },
      { id: "davis-b", sourceCode: "weatherlink", latitude: null, longitude: null },
      { id: "other", sourceCode: "senamhi", latitude: -5, longitude: -80 }
    ] as never[];

    expect(filterWeatherLinkStations(stations, "all", false)).toHaveLength(2);
    expect(filterWeatherLinkStations(stations, "davis-a", true)).toHaveLength(1);
    expect(filterWeatherLinkStations(stations, "davis-b", true)).toHaveLength(0);
  });
});
