import { describe, expect, it } from "vitest";

import { normalizeStageName, resolveStageWeights } from "./weight-matrix";

describe("weight matrix", () => {
  it("normalizes stage names with accents and spaces", () => {
    expect(normalizeStageName("Maduración del brote")).toBe(
      "maduracion_del_brote"
    );
    expect(normalizeStageName("Amarre y cuajado")).toBe("amarre_y_cuajado");
  });

  it("resolves configured weights", () => {
    expect(resolveStageWeights("Floración")).toMatchObject({
      plagas: 25,
      enfermedades: 20,
      nutricion: 15,
      riego: 25,
      labores: 15
    });
  });

  it("returns null for unmapped stages", () => {
    expect(resolveStageWeights("Etapa experimental")).toBeNull();
  });
});
