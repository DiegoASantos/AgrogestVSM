import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateVisitaRiegoDto } from "./create-visita-riego.dto";

describe("CreateVisitaRiegoDto", () => {
  it("exige seleccionar la humedad del suelo", async () => {
    const dto = plainToInstance(CreateVisitaRiegoDto, { tipoRiegoId: 1 });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "humedadSuelo")).toBe(true);
  });

  it("acepta una humedad del suelo válida", async () => {
    const dto = plainToInstance(CreateVisitaRiegoDto, {
      tipoRiegoId: 1,
      humedadSuelo: "optimo"
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
  });
});
