import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateVisitaRecetaDto, LaborDto } from "./create-visita-receta.dto";

describe("LaborDto", () => {
  it.each([
    "limpieza_maleza_motoguadana",
    "poda_formacion",
    "poda_saneamiento",
    "poda_aclareo_iluminacion",
    "poda_rejuvenecimiento_severa"
  ] as const)("acepta la labor %s", async (labor) => {
    const dto = new LaborDto();
    dto.labor = labor;

    expect(await validate(dto)).toEqual([]);
  });

  it("rechaza una labor fuera del contrato", async () => {
    const dto = new LaborDto();
    dto.labor = "poda_desconocida" as LaborDto["labor"];

    expect((await validate(dto)).some((error) => error.property === "labor")).toBe(true);
  });
});

describe("CreateVisitaRecetaDto labores", () => {
  const sevenLabors = [
    "limpieza_maleza_pala",
    "limpieza_maleza_motoguadana",
    "horqueteo",
    "enzunchado",
    "recoleccion_frutos",
    "trampas_mosca",
    "poda_formacion"
  ] as const;

  it("acepta las seis labores historicas junto con una poda", async () => {
    const dto = new CreateVisitaRecetaDto();
    dto.fertilizacion = [];
    dto.labores = sevenLabors.map((labor) => Object.assign(new LaborDto(), { labor }));

    expect((await validate(dto)).some((error) => error.property === "labores")).toBe(
      false
    );
  });

  it("rechaza mas de siete labores", async () => {
    const dto = new CreateVisitaRecetaDto();
    dto.fertilizacion = [];
    dto.labores = [
      ...sevenLabors.map((labor) => Object.assign(new LaborDto(), { labor })),
      Object.assign(new LaborDto(), { labor: "poda_saneamiento" as const })
    ];

    expect((await validate(dto)).some((error) => error.property === "labores")).toBe(
      true
    );
  });
});
