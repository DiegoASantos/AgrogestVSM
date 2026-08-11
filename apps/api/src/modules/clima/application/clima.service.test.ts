import { describe, expect, it, vi } from "vitest";

import { ClimaService } from "./clima.service";

describe("ClimaService", () => {
  it("returns only the latest future forecast emission for a point", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("max(ultima_consulta_exitosa_at)")) {
        return [{ latest: new Date() }];
      }

      if (sql.includes("FROM clima.puntos_climaticos WHERE public_id")) {
        return [
          {
            id: "11",
            public_id: "point-1",
            nombre: "Tambogrande",
            departamento: "Piura",
            distrito: "Tambogrande",
            latitud: "-4.93",
            longitud: "-80.34"
          }
        ];
      }

      if (sql.includes("WITH latest AS")) {
        return [
          {
            variable: "temperature_2m_max",
            value: 34,
            unit: "°C",
            validAt: "2026-08-11T12:00:00-05:00",
            issuedAt: "2026-08-10T08:00:00-05:00"
          }
        ];
      }

      return [];
    });
    const service = new ClimaService({ query } as never);

    const response = await service.forecast("point-1");

    expect(response.data).toEqual([
      expect.objectContaining({
        id: "point-1",
        days: [expect.objectContaining({ variable: "temperature_2m_max" })]
      })
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DISTINCT ON (variable, valido_at)"),
      ["11"]
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("valido_at >= current_date"),
      ["11"]
    );
  });
});
