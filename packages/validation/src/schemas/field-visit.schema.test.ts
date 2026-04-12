import { describe, expect, it } from "vitest";

import { fieldVisitSchema } from "./field-visit.schema";

const baseValidInput = {
  productorId: "prod-1",
  parcelaId: "parc-1",
  tecnicoId: "tec-1",
  fechaProgramada: "2025-05-01"
};

describe("fieldVisitSchema", () => {
  it("accepts a minimal valid input and defaults estado to pendiente", () => {
    const result = fieldVisitSchema.safeParse(baseValidInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estado).toBe("pendiente");
    }
  });

  it("accepts valid estados", () => {
    for (const estado of ["pendiente", "en_progreso", "completada"] as const) {
      const result = fieldVisitSchema.safeParse({ ...baseValidInput, estado });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown estado values", () => {
    const result = fieldVisitSchema.safeParse({
      ...baseValidInput,
      estado: "cancelada"
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "productorId",
    "parcelaId",
    "tecnicoId",
    "fechaProgramada"
  ] as const)("rejects missing %s", (field) => {
    const rest: Record<string, unknown> = { ...baseValidInput };
    delete rest[field];
    const result = fieldVisitSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects observaciones longer than 500 characters", () => {
    const result = fieldVisitSchema.safeParse({
      ...baseValidInput,
      observaciones: "x".repeat(501)
    });
    expect(result.success).toBe(false);
  });

  it("accepts observaciones within the limit and trims them", () => {
    const result = fieldVisitSchema.safeParse({
      ...baseValidInput,
      observaciones: "  todo ok  "
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.observaciones).toBe("todo ok");
    }
  });
});
