import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateCultivoDto } from "./create-cultivo.dto";
import { UpdateCultivoDto } from "./update-cultivo.dto";

async function validateCreate(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateCultivoDto, input);
  const errors = await validate(dto);

  return { dto, errors };
}

async function validateUpdate(input: Record<string, unknown>) {
  const dto = plainToInstance(UpdateCultivoDto, input);
  const errors = await validate(dto);

  return { dto, errors };
}

describe("CreateCultivoDto", () => {
  it("normalizes code to uppercase", async () => {
    const { dto, errors } = await validateCreate({
      code: " arroz ",
      name: "Arroz"
    });

    expect(errors).toHaveLength(0);
    expect(dto.code).toBe("ARROZ");
  });

  it("requires code on create", async () => {
    const { errors } = await validateCreate({ name: "Arroz" });

    expect(errors.some((error) => error.property === "code")).toBe(true);
  });

  it("rejects empty code on create", async () => {
    const { errors } = await validateCreate({ code: " ", name: "Arroz" });

    expect(errors.some((error) => error.property === "code")).toBe(true);
  });
});

describe("UpdateCultivoDto", () => {
  it("allows omitting code on update", async () => {
    const { errors } = await validateUpdate({ name: "Arroz actualizado" });

    expect(errors).toHaveLength(0);
  });

  it("rejects null code on update", async () => {
    const { errors } = await validateUpdate({ code: null });

    expect(errors.some((error) => error.property === "code")).toBe(true);
  });

  it("rejects empty code on update", async () => {
    const { errors } = await validateUpdate({ code: "" });

    expect(errors.some((error) => error.property === "code")).toBe(true);
  });
});
