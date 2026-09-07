import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { EstimacionesController } from "./estimaciones.controller";
import { EstimationWeekParamDto } from "./dto/estimation-week-param.dto";
import { SaveWeekEstimatesDto } from "./dto/save-week-estimates.dto";

describe("EstimacionesController", () => {
  it("permite el modulo solo a ADMIN y ANALISTA", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, EstimacionesController)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
  });

  it("aprueba explicitamente la escritura de ANALISTA", () => {
    expect(
      Reflect.getMetadata(
        ALLOW_ANALYST_MUTATION_KEY,
        EstimacionesController.prototype.saveWeek
      )
    ).toBe(true);
  });

  it("valida una fecha ISO sin exigir que ya sea lunes", async () => {
    const valid = plainToInstance(EstimationWeekParamDto, { fecha: " 2026-09-09 " });
    const invalid = plainToInstance(EstimationWeekParamDto, { fecha: "09/09/2026" });

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.fecha).toBe("2026-09-09");
    expect((await validate(invalid))[0]?.property).toBe("fecha");
  });

  it("acepta enteros no negativos y null, y rechaza valores invalidos", async () => {
    const valid = plainToInstance(SaveWeekEstimatesDto, {
      estimaciones: [
        { agronomoUsuarioId: " 7 ", visitasEstimadas: 0 },
        { agronomoUsuarioId: "8", visitasEstimadas: null }
      ]
    });
    const invalid = plainToInstance(SaveWeekEstimatesDto, {
      estimaciones: [{ agronomoUsuarioId: "0", visitasEstimadas: -1 }]
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.estimaciones[0]?.agronomoUsuarioId).toBe("7");
    expect(await validate(invalid)).not.toHaveLength(0);
  });
});
