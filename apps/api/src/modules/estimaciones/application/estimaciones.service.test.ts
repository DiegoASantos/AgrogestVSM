import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { EstimacionesService, normalizeWeek } from "./estimaciones.service";

describe("EstimacionesService", () => {
  it("normaliza cualquier fecha a una semana de lunes a domingo", () => {
    expect(normalizeWeek("2026-09-09")).toEqual({
      startDate: "2026-09-07",
      endDate: "2026-09-13"
    });
    expect(normalizeWeek("2026-09-13")).toEqual({
      startDate: "2026-09-07",
      endDate: "2026-09-13"
    });
  });

  it("rechaza fechas inexistentes o con otro formato", () => {
    expect(() => normalizeWeek("2026-02-30")).toThrow(BadRequestException);
    expect(() => normalizeWeek("09/07/2026")).toThrow(BadRequestException);
  });

  it("calcula diferencia, cumplimiento y totales sin dividir una meta cero", async () => {
    const query = vi.fn().mockResolvedValue([
      makeRow({ estimatedVisits: 10, actualVisits: "8" }),
      makeRow({
        agronomistUserId: "8",
        engineerName: "Bruno Rios",
        estimatedVisits: 0,
        actualVisits: "1"
      }),
      makeRow({
        agronomistUserId: "9",
        engineerName: "Carla Solis",
        estimatePublicId: null,
        estimatedVisits: null,
        actualVisits: "2",
        createdAt: null,
        updatedAt: null,
        createdByName: null,
        updatedByName: null
      })
    ]);
    const service = new EstimacionesService({ query } as never);

    const result = await service.getWeek("2026-09-10");

    expect(query).toHaveBeenCalledWith(expect.any(String), ["2026-09-07", "2026-09-13"]);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("v.activo = true");
    expect(sql).toContain("v.agronomo_usuario_id");
    expect(sql).toContain("v.fecha_visita >= $1");
    expect(sql).toContain("v.fecha_visita <= $2");
    expect(result.rows[0]).toMatchObject({
      estimatedVisits: 10,
      actualVisits: 8,
      difference: -2,
      compliancePercentage: 80
    });
    expect(result.rows[1]?.compliancePercentage).toBeNull();
    expect(result.rows[2]?.difference).toBeNull();
    expect(result.totals).toEqual({
      agronomists: 3,
      withEstimate: 2,
      estimatedVisits: 10,
      actualVisits: 11,
      difference: 1
    });
  });

  it("rechaza IDs repetidos antes de abrir una transaccion", async () => {
    const transaction = vi.fn();
    const service = new EstimacionesService({ transaction } as never);

    await expect(
      service.saveWeek(
        "2026-09-07",
        [
          { agronomoUsuarioId: "7", visitasEstimadas: 10 },
          { agronomoUsuarioId: "7", visitasEstimadas: 12 }
        ],
        "1"
      )
    ).rejects.toThrow("Cada agronomo puede aparecer una sola vez");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("guarda altas y bajas en una unica transaccion y devuelve la semana", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: "1" }])
      .mockResolvedValueOnce([{ id: "7" }, { id: "8" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const query = vi.fn().mockResolvedValue([]);
    const transaction = vi.fn(async (callback: (manager: unknown) => Promise<void>) =>
      callback({ query: managerQuery })
    );
    const service = new EstimacionesService({ query, transaction } as never);

    const result = await service.saveWeek(
      "2026-09-09",
      [
        { agronomoUsuarioId: "7", visitasEstimadas: 9 },
        { agronomoUsuarioId: "8", visitasEstimadas: null }
      ],
      "1"
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(managerQuery).toHaveBeenCalledTimes(4);
    expect(String(managerQuery.mock.calls[2]?.[0])).toContain("INSERT INTO");
    expect(String(managerQuery.mock.calls[3]?.[0])).toContain("UPDATE");
    expect(result.startDate).toBe("2026-09-07");
  });

  it("rechaza el lote si algun usuario no es un agronomo activo", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: "1" }])
      .mockResolvedValueOnce([]);
    const transaction = vi.fn(async (callback: (manager: unknown) => Promise<void>) =>
      callback({ query: managerQuery })
    );
    const service = new EstimacionesService({ transaction } as never);

    await expect(
      service.saveWeek(
        "2026-09-07",
        [{ agronomoUsuarioId: "7", visitasEstimadas: 5 }],
        "1"
      )
    ).rejects.toThrow("agronomos activos");
    expect(managerQuery).toHaveBeenCalledTimes(2);
  });

  it("rechaza un actor cuyo permiso ya no esta vigente en la base", async () => {
    const managerQuery = vi.fn().mockResolvedValueOnce([]);
    const transaction = vi.fn(async (callback: (manager: unknown) => Promise<void>) =>
      callback({ query: managerQuery })
    );
    const service = new EstimacionesService({ transaction } as never);

    await expect(
      service.saveWeek(
        "2026-09-07",
        [{ agronomoUsuarioId: "7", visitasEstimadas: 5 }],
        "1"
      )
    ).rejects.toThrow("No tienes permisos");
    expect(managerQuery).toHaveBeenCalledOnce();
  });
});

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    agronomistUserId: "7",
    engineerName: "Ana Lopez",
    isActive: true,
    isEditable: true,
    estimatePublicId: "8bb4d763-7313-424a-89a2-2cb66d0c33fc",
    estimatedVisits: 10,
    actualVisits: "8",
    createdAt: "2026-09-07T10:00:00.000Z",
    updatedAt: "2026-09-07T10:00:00.000Z",
    createdByName: "Admin Uno",
    updatedByName: "Admin Uno",
    ...overrides
  };
}
