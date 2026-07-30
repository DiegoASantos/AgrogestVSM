import { describe, expect, it, vi } from "vitest";

import { MobileClimaService } from "./mobile-clima.service";

function openMeteoPayload() {
  return {
    current: {
      time: "2026-07-30T09:00",
      temperature_2m: 24.2,
      relative_humidity_2m: 73,
      precipitation: 0,
      wind_speed_10m: 15,
      weather_code: 2
    },
    hourly: {
      precipitation: Array.from({ length: 24 }, () => 0.2),
      et0_fao_evapotranspiration: Array.from({ length: 24 }, () => 0.1),
      soil_moisture_3_to_9cm: [0.18, 0.19]
    },
    daily: {
      time: ["2026-07-30", "2026-07-31"],
      temperature_2m_min: [18, 19],
      temperature_2m_max: [27, 28],
      precipitation_sum: [4.8, 0],
      precipitation_probability_max: [35, 10],
      et0_fao_evapotranspiration: [2.4, 2.7],
      wind_speed_10m_max: [21, 19],
      weather_code: [2, 1]
    }
  };
}

describe("MobileClimaService", () => {
  it("consulta el punto territorial permitido y reutiliza caché de corta duración", async () => {
    const dataSource = {
      query: vi
        .fn()
        .mockResolvedValue([
          { id: "1", district: "Tambogrande", latitude: "-4.926", longitude: "-80.344" }
        ])
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => openMeteoPayload() });
    vi.stubGlobal("fetch", fetchMock);
    const service = new MobileClimaService(dataSource as never);

    const first = await service.getByDistrict("tambogrande");
    const second = await service.getByDistrict("tambogrande");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.data).toMatchObject({
      district: { code: "tambogrande", name: "Tambogrande" },
      field: { rainfallLast24hMm: 4.8, et0TodayMm: 2.4, soilMoisture3To9cmM3M3: 0.19 }
    });
    expect(second.data.current.temperatureC).toBe(24.2);
    vi.unstubAllGlobals();
  });

  it("rechaza distritos fuera de la lista temporal admitida", async () => {
    const service = new MobileClimaService({ query: vi.fn() } as never);
    await expect(service.getByDistrict("piura")).rejects.toThrow(
      "Distrito climático no disponible."
    );
  });

  it("informa cuando el punto climático configurado no está disponible", async () => {
    const service = new MobileClimaService({
      query: vi.fn().mockResolvedValue([])
    } as never);
    await expect(service.getByDistrict("casma")).rejects.toThrow(
      "El punto climático del distrito no está disponible."
    );
  });
});
