import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { ReportesController } from "./reportes.controller";
import { ReporteCamposEtapasQueryDto } from "./dto/reporte-campos-etapas-query.dto";
import { ReporteEstimacionesQueryDto } from "./dto/reporte-estimaciones-query.dto";
import { ReporteParcelasQueryDto } from "./dto/reporte-parcelas-query.dto";
import { ReporteVisitasQueryDto } from "./dto/reporte-visitas-query.dto";

describe("ReportesController", () => {
  it("allows report reads only to ADMIN and ANALISTA", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, ReportesController)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
  });

  it("validates required dates and positive optional identifiers", async () => {
    const validDto = plainToInstance(ReporteVisitasQueryDto, {
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30",
      agronomo_usuario_id: "7",
      productor_id: "15"
    });
    const invalidDto = plainToInstance(ReporteVisitasQueryDto, {
      fecha_desde: "",
      fecha_hasta: "not-a-date",
      agronomo_usuario_id: "0",
      productor_id: "abc"
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect((await validate(invalidDto)).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "fecha_desde",
        "fecha_hasta",
        "agronomo_usuario_id",
        "productor_id"
      ])
    );
  });

  it("validates the weekly estimates report dates and agronomist", async () => {
    const validDto = plainToInstance(ReporteEstimacionesQueryDto, {
      fecha_desde: " 2026-09-01 ",
      fecha_hasta: "2026-09-30",
      agronomo_usuario_id: " 7 "
    });
    const invalidDto = plainToInstance(ReporteEstimacionesQueryDto, {
      fecha_desde: "2026-09-01T00:00:00Z",
      fecha_hasta: "not-a-date",
      agronomo_usuario_id: "0"
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(validDto).toMatchObject({
      fecha_desde: "2026-09-01",
      agronomo_usuario_id: "7"
    });
    expect((await validate(invalidDto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["fecha_desde", "fecha_hasta", "agronomo_usuario_id"])
    );
  });

  it("wraps the weekly estimates report in the standard API envelope", async () => {
    const data = {
      range: { startDate: "2026-09-07", endDate: "2026-09-13" },
      weeks: []
    };
    const getEstimatesReport = vi.fn().mockResolvedValue(data);
    const controller = new ReportesController({ getEstimatesReport } as never);
    const query = {
      fecha_desde: "2026-09-07",
      fecha_hasta: "2026-09-13"
    };

    await expect(controller.getEstimatesReport(query)).resolves.toEqual({
      success: true,
      data
    });
    expect(getEstimatesReport).toHaveBeenCalledWith(query);
  });

  it("validates the fields-by-stage range and optional identifiers", async () => {
    const validDto = plainToInstance(ReporteCamposEtapasQueryDto, {
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30",
      agronomo_usuario_id: " 7 ",
      productor_id: "15"
    });
    const invalidDto = plainToInstance(ReporteCamposEtapasQueryDto, {
      fecha_desde: "",
      fecha_hasta: "not-a-date",
      agronomo_usuario_id: "0",
      productor_id: "abc"
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(validDto.agronomo_usuario_id).toBe("7");
    expect((await validate(invalidDto)).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "fecha_desde",
        "fecha_hasta",
        "agronomo_usuario_id",
        "productor_id"
      ])
    );
  });

  it("validates the parcel report range, identifiers and status", async () => {
    const validDto = plainToInstance(ReporteParcelasQueryDto, {
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30",
      agronomo_usuario_id: " 7 ",
      productor_id: "15",
      sector_id: "2",
      subsector_id: "3",
      activo: "false"
    });
    const invalidDto = plainToInstance(ReporteParcelasQueryDto, {
      fecha_desde: "",
      fecha_hasta: "not-a-date",
      agronomo_usuario_id: "0",
      productor_id: "abc",
      sector_id: "-1",
      subsector_id: "0",
      activo: "todos"
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(validDto).toMatchObject({
      agronomo_usuario_id: "7",
      activo: false
    });
    expect((await validate(invalidDto)).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "fecha_desde",
        "fecha_hasta",
        "agronomo_usuario_id",
        "productor_id",
        "sector_id",
        "subsector_id",
        "activo"
      ])
    );
  });
});
