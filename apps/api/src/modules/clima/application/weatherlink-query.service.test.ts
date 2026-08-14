import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NormalizedWeatherLinkReading } from "../infrastructure/weatherlink/weatherlink.types";
import {
  summarizeWeatherLinkDay,
  WeatherLinkQueryService,
  validateWeatherLinkRange
} from "./weatherlink-query.service";

describe("WeatherLink direct query range", () => {
  const now = new Date("2026-08-14T15:00:00.000Z");

  it("accepts one to seven closed days in Lima", () => {
    expect(
      validateWeatherLinkRange("2026-08-07", "2026-08-13", now, "America/Lima").days
    ).toHaveLength(7);
  });

  it.each([
    [undefined, "2026-08-13"],
    ["2026-08-13", undefined],
    ["2026-08-14", "2026-08-14"],
    ["2026-08-06", "2026-08-13"],
    ["2026-08-13", "2026-08-12"],
    ["2026-02-30", "2026-03-01"]
  ])("rejects an unsafe range", (from, to) => {
    expect(() => validateWeatherLinkRange(from, to, now, "America/Lima")).toThrow(
      BadRequestException
    );
  });
});

describe("WeatherLinkQueryService", () => {
  afterEach(() => vi.useRealTimers());

  it("queries once, reuses the day cache and never writes readings", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T15:00:00.000Z"));
    const query = vi.fn().mockResolvedValue([
      {
        id: "10",
        publicId: "4e0565d7-5f67-4aa1-85fb-e3dd04c1f206",
        nombre: "Fundo",
        codigo: "weatherlink:station-uuid",
        tipo: "PROPIA",
        isActive: true,
        sourceCode: "weatherlink"
      }
    ]);
    const historic = vi.fn().mockResolvedValue({
      sensors: [
        {
          data: [{ ts: 1_765_566_000, temp_out: 77 }]
        }
      ]
    });
    const service = new WeatherLinkQueryService(
      { query } as never,
      {
        config: { enabled: true, timeZone: "America/Lima" },
        historic
      } as never
    );

    const first = await service.history(
      "4e0565d7-5f67-4aa1-85fb-e3dd04c1f206",
      "2026-08-13",
      "2026-08-13",
      "user-1"
    );
    const second = await service.history(
      "4e0565d7-5f67-4aa1-85fb-e3dd04c1f206",
      "2026-08-13",
      "2026-08-13",
      "user-1"
    );

    expect(historic).toHaveBeenCalledTimes(1);
    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls.every(([sql]) => !String(sql).match(/INSERT|UPDATE/iu))).toBe(
      true
    );
  });
});

describe("WeatherLink daily summary", () => {
  it("aggregates field metrics without inventing missing values", () => {
    const rows: NormalizedWeatherLinkReading[] = [
      reading("temperature_2m", 20),
      reading("temperature_2m", 30),
      reading("relative_humidity_2m", 60),
      reading("relative_humidity_2m", 80),
      reading("precipitation", 1.2),
      reading("precipitation", 0.8),
      reading("wind_speed_10m", 11),
      reading("wind_speed_10m", 17)
    ];

    expect(summarizeWeatherLinkDay("2026-08-13", rows)).toEqual({
      date: "2026-08-13",
      temperatureMinC: 20,
      temperatureMaxC: 30,
      relativeHumidityAveragePercent: 70,
      precipitationTotalMm: 2,
      windSpeedMaxKmh: 17,
      readingsCount: 8
    });
  });
});

function reading(variable: string, value: number): NormalizedWeatherLinkReading {
  return { variable, value, unit: "unit", dataAt: "2026-08-13T12:00:00.000Z" };
}
