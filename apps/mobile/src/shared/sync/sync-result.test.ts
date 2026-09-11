import { describe, expect, it } from "vitest";

import { createCompletedOutboxSyncResult, isSyncCycleComplete } from "./sync-result";

const baseCounts = {
  processed: 0,
  skipped: 0,
  errors: 0,
  transientFailures: 0,
  permanentFailures: 0,
  dependencySkipped: 0,
  unattempted: 0
};

describe("createCompletedOutboxSyncResult", () => {
  it("reports a partial run while pending records remain", () => {
    const result = createCompletedOutboxSyncResult(
      { ...baseCounts, processed: 5, dependencySkipped: 2 },
      { pendingCount: 323, errorCount: 0 }
    );

    expect(result).toMatchObject({
      status: "partial",
      processed: 5,
      dependencySkipped: 2,
      remainingPending: 323
    });
    expect(result.message).toContain("quedan 323 pendientes");
  });

  it("reports success only when no records remain", () => {
    const result = createCompletedOutboxSyncResult(
      { ...baseCounts, processed: 7 },
      { pendingCount: 0, errorCount: 0 }
    );

    expect(result.status).toBe("success");
    expect(result.remainingPending).toBe(0);
  });

  it("does not report success while a durable error remains", () => {
    const result = createCompletedOutboxSyncResult(baseCounts, {
      pendingCount: 0,
      errorCount: 2
    });

    expect(result.status).toBe("failed");
    expect(result.message).toContain("2 registros con error");
  });

  it("records a completed sync only when pending and error counts are zero", () => {
    const cycle = {
      stoppedByAuth: false,
      stoppedByConnectivity: false,
      aborted: false,
      errors: 0
    };

    expect(isSyncCycleComplete(cycle, { pendingCount: 0, errorCount: 0 })).toBe(true);
    expect(isSyncCycleComplete(cycle, { pendingCount: 1, errorCount: 0 })).toBe(false);
    expect(isSyncCycleComplete(cycle, { pendingCount: 0, errorCount: 1 })).toBe(false);
  });
});
