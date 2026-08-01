import { describe, expect, it } from "vitest";

import { hasUnsyncedDiseaseObservation } from "./disease-sync";

describe("finalización offline del módulo Enfermedades", () => {
  const diseaseIds = new Set(["oidium", "alternaria"]);

  it.each(["pending", "error"] as const)(
    "espera cuando una enfermedad está %s",
    (syncStatus) => {
      expect(
        hasUnsyncedDiseaseObservation(
          [{ pestDiseaseId: "oidium", syncStatus }],
          diseaseIds
        )
      ).toBe(true);
    }
  );

  it("permite finalizar cuando las enfermedades ya se sincronizaron", () => {
    expect(
      hasUnsyncedDiseaseObservation(
        [
          { pestDiseaseId: "oidium", syncStatus: "synced" },
          { pestDiseaseId: "trips", syncStatus: "pending" }
        ],
        diseaseIds
      )
    ).toBe(false);
  });
});
