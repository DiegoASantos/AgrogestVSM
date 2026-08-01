import { describe, expect, it } from "vitest";

import { validateRequiredPhenologicalStage } from "./required-phenological-stage";

describe("validateRequiredPhenologicalStage", () => {
  it("rejects an empty selection", () => {
    expect(validateRequiredPhenologicalStage("")).toBe(
      "Selecciona una etapa fenologica."
    );
  });

  it("accepts a selected stage", () => {
    expect(validateRequiredPhenologicalStage("stage-floracion")).toBeUndefined();
  });
});
