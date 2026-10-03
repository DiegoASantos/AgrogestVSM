import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateVisitaCampoDto } from "./create-visita-campo.dto";
import { UpdateVisitaCampoDto } from "./update-visita-campo.dto";

const baseInput = {
  cropId: "1",
  varietyId: "2",
  parcelaId: "3",
  campaignId: "4",
  agronomistUserId: "5",
  visitDate: "2026-08-01",
  startVisitTime: "08:30"
};

const validInput = {
  ...baseInput,
  phenologicalStageId: "6"
};

describe("CreateVisitaCampoDto", () => {
  it("requires a phenological stage", async () => {
    const dto = plainToInstance(CreateVisitaCampoDto, baseInput);
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "phenologicalStageId")).toBe(true);
  });

  it("accepts a valid phenological stage", async () => {
    const dto = plainToInstance(CreateVisitaCampoDto, validInput);
    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.phenologicalStageId).toBe("6");
  });

  it("accepts a list of phenological stages with parcel coverage", async () => {
    const dto = plainToInstance(CreateVisitaCampoDto, {
      ...validInput,
      subEtapaId: "7",
      phenologicalStages: [
        { phenologicalStageId: "6", subEtapaId: "7", coveragePercentage: 60 },
        { phenologicalStageId: "8", subEtapaId: "9", coveragePercentage: 40 }
      ]
    });
    expect(await validate(dto)).toEqual([]);
  });

  it("rejects malformed rows in the stage list", async () => {
    const dto = plainToInstance(CreateVisitaCampoDto, {
      ...validInput,
      phenologicalStages: [{ phenologicalStageId: "wrong", coveragePercentage: 101 }]
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "phenologicalStages")).toBe(true);
  });
});

describe("UpdateVisitaCampoDto", () => {
  it("allows an update to omit the phenological stage", async () => {
    const dto = plainToInstance(UpdateVisitaCampoDto, {
      generalObservation: "Seguimiento sin cambiar la etapa."
    });
    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.phenologicalStageId).toBeUndefined();
  });

  it("rejects an explicit attempt to clear the phenological stage", async () => {
    const dto = plainToInstance(UpdateVisitaCampoDto, {
      phenologicalStageId: null
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "phenologicalStageId")).toBe(true);
  });
});
