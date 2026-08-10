import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { UpdateProfileDto } from "./update-profile.dto";

async function transform(input: Record<string, unknown>) {
  const dto = plainToInstance(UpdateProfileDto, input);
  const errors = await validate(dto);
  return { dto, errors };
}

describe("UpdateProfileDto", () => {
  describe("required fields", () => {
    it("accepts a valid DTO with all required fields", async () => {
      const { dto, errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe("Juan");
      expect(dto.lastName).toBe("Perez");
      expect(dto.email).toBe("juan@agrogest.pe");
    });

    it("rejects when firstName is missing", async () => {
      const { errors } = await transform({
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "firstName")).toBe(true);
    });

    it("rejects when lastName is missing", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        email: "juan@agrogest.pe"
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "lastName")).toBe(true);
    });

    it("rejects when email is missing", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez"
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "email")).toBe(true);
    });

    it("trims required string fields", async () => {
      const { dto, errors } = await transform({
        firstName: "  Juan  ",
        lastName: "  Perez  ",
        email: "  juan@agrogest.pe  "
      });

      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe("Juan");
      expect(dto.lastName).toBe("Perez");
      expect(dto.email).toBe("juan@agrogest.pe");
    });

    it("rejects empty firstName after trim", async () => {
      const { errors } = await transform({
        firstName: "   ",
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "firstName")).toBe(true);
    });

    it("rejects invalid email format", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "not-an-email"
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === "email")).toBe(true);
    });
  });

  describe("optional phone", () => {
    it("accepts phone when provided", async () => {
      const { dto, errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        phone: "999888777"
      });

      expect(errors).toHaveLength(0);
      expect(dto.phone).toBe("999888777");
    });

    it("allows phone to be undefined", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      expect(errors).toHaveLength(0);
    });

    it("rejects phone longer than 20 characters", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        phone: "1".repeat(21)
      });

      expect(errors.some((e) => e.property === "phone")).toBe(true);
    });

    it("trims phone value", async () => {
      const { dto, errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        phone: "  999888777  "
      });

      expect(errors).toHaveLength(0);
      expect(dto.phone).toBe("999888777");
    });
  });

  describe("newPassword", () => {
    it("allows newPassword to be omitted", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe"
      });

      expect(errors).toHaveLength(0);
    });

    it("accepts newPassword with valid length", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        newPassword: "123456"
      });

      expect(errors).toHaveLength(0);
    });

    it("rejects newPassword shorter than 6 characters", async () => {
      const { errors } = await transform({
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@agrogest.pe",
        newPassword: "12345"
      });

      expect(errors.some((e) => e.property === "newPassword")).toBe(true);
    });
  });
});
