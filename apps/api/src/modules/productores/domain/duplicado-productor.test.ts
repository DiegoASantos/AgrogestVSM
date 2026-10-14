import { describe, expect, it } from "vitest";
import { candidateReasons, type PersonaComparable } from "./duplicado-productor";

const person = (id: string, firstName: string, lastName: string): PersonaComparable => ({
  id, firstName, lastName, documentTypeId: null, documentNumber: null,
  phone: null, email: null
});

describe("candidateReasons", () => {
  it("detects variants with accents and omitted middle names", () => {
    expect(candidateReasons(
      person("1", "José Alberto", "Fernández Ruiz"),
      person("2", "JOSE", "FERNANDEZ RUIZ")
    )).toContain("NOMBRE");
  });

  it("does not flag two people sharing only one token", () => {
    expect(candidateReasons(
      person("1", "José", "Fernández"), person("2", "José Alberto", "Pérez")
    )).toEqual([]);
  });
});
