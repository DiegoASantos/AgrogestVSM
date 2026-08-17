import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateFertilizanteDto } from "./create-fertilizante.dto";
import { CreateMarcaProductoDto } from "./create-marca-producto.dto";

describe("longitud de concentracion comercial", () => {
  it.each([
    [CreateFertilizanteDto, { name: "Fertilizante", tipo: "solido" }],
    [CreateMarcaProductoDto, { name: "Marca", tipoProductoId: "1" }]
  ])("acepta 300 y rechaza 301 caracteres en %s", async (Dto, base) => {
    const accepted = Object.assign(new Dto(), base, {
      concentracion: "x".repeat(300)
    });
    const rejected = Object.assign(new Dto(), base, {
      concentracion: "x".repeat(301)
    });

    expect(await validate(accepted)).toEqual([]);
    expect(
      (await validate(rejected)).some((error) => error.property === "concentracion")
    ).toBe(true);
  });
});
