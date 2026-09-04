import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { ReportesController } from "./reportes.controller";
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
});

