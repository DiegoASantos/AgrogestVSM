import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { MezclaDto } from "./create-visita-receta.dto";

describe("MezclaDto frecuenciaDosis", () => {
  it("recorta una frecuencia valida", async () => {
    const dto = plainToInstance(MezclaDto, {
      numero: 1,
      frecuenciaDosis: "  Cada 7 dias  ",
      factor: 1,
      factorEditable: false,
      productos: []
    });

    expect(dto.frecuenciaDosis).toBe("Cada 7 dias");
    expect(await validate(dto)).toEqual([]);
  });

  it("rechaza una frecuencia mayor a 200 caracteres", async () => {
    const dto = plainToInstance(MezclaDto, {
      numero: 1,
      frecuenciaDosis: "x".repeat(201),
      factor: 1,
      factorEditable: false,
      productos: []
    });

    expect(
      (await validate(dto)).some((error) => error.property === "frecuenciaDosis")
    ).toBe(true);
  });
});
