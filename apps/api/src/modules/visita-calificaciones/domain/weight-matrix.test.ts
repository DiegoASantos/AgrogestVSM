import { describe, expect, it } from "vitest";

import { normalizeStageName, resolveStageWeights } from "./weight-matrix";

describe("weight matrix", () => {
  it("normalizes stage names with accents and spaces", () => {
    expect(normalizeStageName("Maduración del brote")).toBe(
      "maduracion_del_brote"
    );
    expect(normalizeStageName("Amarre y cuajado")).toBe("amarre_y_cuajado");
  });

  it("resolves aliases for common naming variations", () => {
    expect(resolveStageWeights("Postcosecha y poda")).toMatchObject({
      plagas: 15,
      enfermedades: 20,
      nutricion: 25,
      riego: 15,
      labores: 25
    });
    expect(resolveStageWeights("Cuajado y amarre")).toMatchObject({
      plagas: 25,
      enfermedades: 15,
      nutricion: 25,
      riego: 20,
      labores: 15
    });
    expect(resolveStageWeights("Maduracion brote")).toMatchObject({
      plagas: 25,
      enfermedades: 20,
      nutricion: 15,
      riego: 25,
      labores: 15
    });
    expect(resolveStageWeights("Desarrollo fruto")).toMatchObject({
      plagas: 20,
      enfermedades: 25,
      nutricion: 15,
      riego: 25,
      labores: 15
    });
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
