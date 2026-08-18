import { describe, expect, it } from "vitest";

import type { NewVisitaCampoFormValues } from "../types";
import {
  buildStepOneTutorialSteps,
  findFirstPendingTutorialStep,
  findNextPendingTutorialStep,
  getAreaHectaresIssue,
  getPlantsCountIssue,
  getSowingDateIssue,
  mergeStepOneFormValues,
  takePreviousTutorialStep
} from "./step-one-tutorial";

const completeValues: NewVisitaCampoFormValues = {
  crop: "crop-1",
  variety: "variety-1",
  parcelaId: "parcel-1",
  parcelaLabel: "P-01",
  campaign: "campaign-1",
  plantsCount: "120",
  areaHectares: "1.5",
  sowingDate: "2026-08-10",
  visitDate: "2026-08-18",
  startVisitTime: "08:30",
  phenologicalStage: "stage-1",
  subEtapaId: "sub-stage-1",
  subEtapaPercentage: "50",
  generalObservation: "Cultivo uniforme"
};

function buildSteps(overrides: Partial<NewVisitaCampoFormValues> = {}) {
  return buildStepOneTutorialSteps({
    values: { ...completeValues, ...overrides },
    today: "2026-08-18",
    activeCatalog: null,
    isLoadingCultivos: false,
    isLoadingVariedades: false,
    isLoadingEtapasFenologicas: false,
    isLoadingProgress: false,
    showProgress: true
  });
}

describe("step one tutorial", () => {
  it("keeps the expected field order and skips fields already complete", () => {
    const steps = buildSteps({ plantsCount: "", areaHectares: "" });

    expect(steps.map((step) => step.id)).toEqual([
      "crop",
      "variety",
      "plantsCount",
      "areaHectares",
      "sowingDate",
      "startVisitTime",
      "phenologicalStage",
      "subEtapaPercentage",
      "generalObservation"
    ]);
    expect(findFirstPendingTutorialStep(steps)?.id).toBe("plantsCount");
    expect(findNextPendingTutorialStep(steps, "plantsCount")?.id).toBe("areaHectares");
  });

  it("waits on a dependent catalog instead of jumping past it", () => {
    const steps = buildStepOneTutorialSteps({
      values: { ...completeValues, variety: "" },
      today: "2026-08-18",
      activeCatalog: null,
      isLoadingCultivos: false,
      isLoadingVariedades: true,
      isLoadingEtapasFenologicas: false,
      isLoadingProgress: false,
      showProgress: false
    });

    const variety = findFirstPendingTutorialStep(steps);
    expect(variety?.id).toBe("variety");
    expect(variety?.isEnabled).toBe(false);
    expect(variety?.isLoading).toBe(true);
  });

  it("allows the optional observation to be the last pending step", () => {
    const steps = buildSteps({ generalObservation: "" });

    const observation = findFirstPendingTutorialStep(steps);
    expect(observation?.id).toBe("generalObservation");
    expect(observation?.isOptional).toBe(true);
    expect(findNextPendingTutorialStep(steps, observation!.id)).toBeNull();
  });

  it("accepts a persisted start time that includes seconds", () => {
    const steps = buildSteps({ startVisitTime: "08:30:00" });

    expect(steps.find((step) => step.id === "startVisitTime")?.isComplete).toBe(true);
  });

  it("restores only current step one fields from an older draft", () => {
    const restored = mergeStepOneFormValues(completeValues, {
      plantsCount: "240",
      endVisitTime: "17:30",
      unknownLegacyField: "ignored"
    });

    expect(restored.plantsCount).toBe("240");
    expect(restored).not.toHaveProperty("endVisitTime");
    expect(restored).not.toHaveProperty("unknownLegacyField");
  });

  it("returns through the visited field history", () => {
    expect(takePreviousTutorialStep(["crop", "variety", "plantsCount"])).toEqual({
      previousId: "plantsCount",
      remainingHistory: ["crop", "variety"]
    });
    expect(takePreviousTutorialStep([])).toEqual({
      previousId: null,
      remainingHistory: []
    });
  });
});

describe("required step one values", () => {
  it("requires a non-negative whole plants count", () => {
    expect(getPlantsCountIssue("")).toBe("missing");
    expect(getPlantsCountIssue("1.5")).toBe("invalid");
    expect(getPlantsCountIssue("-1")).toBe("invalid");
    expect(getPlantsCountIssue("0")).toBeNull();
  });

  it("requires a positive area", () => {
    expect(getAreaHectaresIssue("")).toBe("missing");
    expect(getAreaHectaresIssue("0")).toBe("invalid");
    expect(getAreaHectaresIssue("0.25")).toBeNull();
  });

  it("requires a valid sowing date that is not in the future", () => {
    expect(getSowingDateIssue("", "2026-08-18")).toBe("missing");
    expect(getSowingDateIssue("18/08/2026", "2026-08-18")).toBe("invalid");
    expect(getSowingDateIssue("2026-08-19", "2026-08-18")).toBe("invalid");
    expect(getSowingDateIssue("2026-08-18", "2026-08-18")).toBeNull();
  });
});
