import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
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

  it("queries the latest reading independently for each reservoir variable", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new ClimaService({ query } as never);

    await service.getReservorios();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT DISTINCT ON (variable)")
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE reservorio_id = r.id")
    );
  });

  it("creates a manual reading with the authenticated user and configured source", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM clima.reservorios WHERE public_id")) {
        return [reservoirRow];
      }
      if (sql.includes("codigo='manual_reservorios'")) return [{ id: "9" }];
      if (sql.includes("INSERT INTO clima.lecturas_reservorios")) {
        return [{ publicId: "reading-1", variable: "volumen_mmc" }];
      }
      return [];
    });
    const service = new ClimaService({ query } as never);

    await service.createReservorioReading(
      reservoirRow.public_id,
      {
        variable: "volumen_mmc",
        valor: 500,
        unidad: "MMC",
        dato_at: "2026-08-11T08:00:00-05:00"
      },
      "user-public-id"
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO clima.lecturas_reservorios"),
      [
        reservoirRow.id,
        "9",
        "volumen_mmc",
        500,
        "MMC",
        "OBSERVADO",
        "2026-08-11T08:00:00-05:00",
        "user-public-id"
      ]
    );
  });

  it("rejects an inconsistent unit and a missing manual source", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM clima.reservorios WHERE public_id")) {
        return [reservoirRow];
      }
      return [];
    });
    const service = new ClimaService({ query } as never);

    await expect(
      service.createReservorioReading(
        reservoirRow.public_id,
        {
          variable: "volumen_mmc",
          valor: 500,
          unidad: "mm",
          dato_at: "2026-08-11T08:00:00-05:00"
        },
        "user-public-id"
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createReservorioReading(
        reservoirRow.public_id,
        {
          variable: "volumen_mmc",
          valor: 500,
          unidad: "MMC",
          dato_at: "2026-08-11T08:00:00-05:00"
        },
        "user-public-id"
      )
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("scopes updates and deletes to the selected reservoir", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM clima.reservorios WHERE public_id")) {
        return [reservoirRow];
      }
      if (sql.startsWith("SELECT variable")) {
        return [{ variable: "volumen_mmc" }];
      }
      if (sql.includes("UPDATE clima.lecturas_reservorios")) {
        return [{ publicId: "reading-1" }];
      }
      if (sql.includes("DELETE FROM clima.lecturas_reservorios")) {
        return [{ id: "1" }];
      }
      return [];
    });
    const service = new ClimaService({ query } as never);

    await service.updateReservorioReading(reservoirRow.public_id, "reading-1", {
      valor: 450
    });
    await service.deleteReservorioReading(reservoirRow.public_id, "reading-1");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("AND reservorio_id = $2 RETURNING id"),
      ["reading-1", reservoirRow.id]
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("AND reservorio_id = $2"),
      ["reading-1", reservoirRow.id]
    );
  });

  it("returns 404 when a reading does not belong to the reservoir", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM clima.reservorios WHERE public_id")) {
        return [reservoirRow];
      }
      return [];
    });
    const service = new ClimaService({ query } as never);

    await expect(
      service.updateReservorioReading(reservoirRow.public_id, "other-reading", {
        valor: 450
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.deleteReservorioReading(reservoirRow.public_id, "other-reading")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects an inverted history date range", async () => {
    const query = vi.fn(async (sql: string) =>
      sql.includes("FROM clima.reservorios WHERE public_id") ? [reservoirRow] : []
    );
    const service = new ClimaService({ query } as never);

    await expect(
      service.getReservorioHistory(
        reservoirRow.public_id,
        undefined,
        "2026-08-12T00:00:00-05:00",
        "2026-08-11T00:00:00-05:00"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps stations from every source in the station inventory", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM clima.estaciones_meteorologicas e")) {
        return [
          {
            id: "1",
            publicId: "weatherlink-station",
            nombre: "Davis",
            codigo: "weatherlink:1",
            tipo: "PROPIA",
            latitude: null,
            longitude: null,
            estado: "OPERATIVA",
            variables: [],
            isActive: true,
            source: "WeatherLink",
            sourceCode: "weatherlink"
          },
          {
            id: "2",
            publicId: "senamhi-station",
            nombre: "SENAMHI",
            codigo: "senamhi:1",
            tipo: "PUBLICA",
            latitude: -5,
            longitude: -81,
            estado: "OPERATIVA",
            variables: [],
            isActive: true,
            source: "SENAMHI"
          }
        ];
      }
      return [];
    });
    const service = new ClimaService({ query } as never);

    const response = await service.stations();

    expect(response.data).toHaveLength(2);
    expect(response.data[0]).toMatchObject({
      latitude: null,
      longitude: null,
      sourceCode: "weatherlink"
    });
    const inventorySql = query.mock.calls.find(([sql]) =>
      sql.includes("FROM clima.estaciones_meteorologicas e")
    )?.[0];
    expect(inventorySql).not.toContain("f.codigo='weatherlink'");
    expect(inventorySql).toContain('f.codigo AS "sourceCode"');
  });
});

const reservoirRow = {
  id: "31",
  public_id: "4ed1f98f-d2f3-4a3c-a936-6527263709a7",
  nombre: "Poechos",
  departamento: "Piura",
  provincia: "Sullana",
  distrito: "Lancones",
  latitud: "-4.683333",
  longitud: "-80.5",
  capacidad_max_mmc: 885,
  cota_max_msnm: 108
};
