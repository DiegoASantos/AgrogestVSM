import { describe, expect, it } from "vitest";

import { getSanitaryObservationIdsToDelete } from "./sanitary-observation-reconciliation";

describe("getSanitaryObservationIdsToDelete", () => {
  const observations = [
    { id: "obs-pest-1", pestDiseaseId: "pest-1" },
    { id: "obs-pest-2", pestDiseaseId: "pest-2" },
    { id: "obs-disease-1", pestDiseaseId: "disease-1" }
  ];

  it("returns only unselected observations from the active sanitary step", () => {
    expect(
      getSanitaryObservationIdsToDelete(
        observations,
        new Set(["pest-1", "pest-2"]),
        new Set(["pest-2"])
      )
    ).toEqual(["obs-pest-1"]);
  });

  it("returns every active observation when the step is fully cleared", () => {
    expect(
      getSanitaryObservationIdsToDelete(observations, new Set(["disease-1"]), new Set())
    ).toEqual(["obs-disease-1"]);
  });
});
