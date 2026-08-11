import { describe, expect, it } from "vitest";

import { normalizeWeatherLinkPayload } from "./weatherlink.mapper";

describe("normalizeWeatherLinkPayload", () => {
  it("normalizes agricultural and soil observations to canonical units", () => {
    const rows = normalizeWeatherLinkPayload({
      sensors: [
        {
          data: [
            {
              ts: 1_723_456_789,
              temp_out: 86,
              hum_out: 70,
              wind_speed_avg: 10,
              rainfall_in: 1,
              bar_sea_level: 29.92,
              temp_soil_1: 68,
              moist_soil_1: 22,
              wet_leaf_1: 5
            }
          ]
        }
      ]
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variable: "temperature_2m", value: 30, unit: "°C" }),
        expect.objectContaining({ variable: "wind_speed_10m", value: 16.0934 }),
        expect.objectContaining({ variable: "precipitation", value: 25.4 }),
        expect.objectContaining({ variable: "soil_temperature_1", value: 20 }),
        expect.objectContaining({ variable: "soil_moisture_1_cb", value: 22 }),
        expect.objectContaining({ variable: "leaf_wetness_1", value: 5 })
      ])
    );
  });

  it("ignores health fields, invalid values and duplicate variables", () => {
    const rows = normalizeWeatherLinkPayload({
      sensors: [
        { data: [{ ts: 1_700_000_000, temp_out: 77, wifi_rssi: -40 }] },
        { data: [{ ts: 1_700_000_000, temp_last: 80, hum_out: null }] }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ variable: "temperature_2m", value: 25 });
  });
});
