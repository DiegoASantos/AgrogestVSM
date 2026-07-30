import { describe, expect, it, vi } from "vitest";

import { ParcelaClimaService } from "./parcela-clima.service";

const authorizedUser = {
  sub: "8",
  userId: "8",
  email: "agronomo@example.test",
  roles: ["AGRONOMO"]
};

function parcela(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    isActive: true,
    agronomoUsuarioId: "8",
    referencePoint: { type: "Point", coordinates: [-79.85, -6.77] },
    geometry: null,
    ...overrides
  };
}

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

describe("ParcelaClimaService", () => {
  it("deriva una estimación de la georreferencia y reutiliza la caché de corta duración", async () => {
    const repository = { findOne: vi.fn().mockResolvedValue(parcela()) };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => openMeteoPayload() });
    vi.stubGlobal("fetch", fetchMock);
    const service = new ParcelaClimaService(repository as never);

    const first = await service.getByParcelaId("1", authorizedUser);
    const second = await service.getByParcelaId("1", authorizedUser);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.data).toMatchObject({
      parcelaId: "1",
      source: { provider: "Open-Meteo", modelSelection: "best_match" },
      field: { rainfallLast24hMm: 4.8, et0TodayMm: 2.4, soilMoisture3To9cmM3M3: 0.19 }
    });
    expect(second.data.current.temperatureC).toBe(24.2);
    vi.unstubAllGlobals();
  });

  it("no consulta clima para una parcela fuera del alcance del agrónomo", async () => {
    const repository = { findOne: vi.fn().mockResolvedValue(parcela({ agronomoUsuarioId: "9" })) };
    const service = new ParcelaClimaService(repository as never);

    await expect(service.getByParcelaId("1", authorizedUser)).rejects.toThrow("Parcela no encontrada.");
  });
});
