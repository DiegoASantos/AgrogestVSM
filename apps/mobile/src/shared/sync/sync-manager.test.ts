import { describe, expect, it } from "vitest";

import {
  NETWORK_QUALITY_HISTORY_TTL_MS,
  SyncManager,
  type SyncManagerState,
  type SyncManagerStateStore
} from "./sync-manager";

class MemoryStore implements SyncManagerStateStore {
  state: SyncManagerState | null = null;

  load() {
    return this.state;
  }

  save(state: SyncManagerState) {
    this.state = state;
  }
}

describe("SyncManager", () => {
  it("classifies an empty or successful window as stable", () => {
    const manager = buildManager();

    expect(manager.evaluateConnection(true)).toBe("stable");

    manager.recordAttempt(true);
    manager.recordAttempt(true);

    expect(manager.evaluateConnection(true)).toBe("stable");
    expect(manager.getSuccessRate()).toBe(1);
  });

  it("classifies a low success rate as unstable and applies adaptive backoff", () => {
    const manager = buildManager();

    manager.recordAttempt(false);
    manager.recordAttempt(false);
    manager.recordAttempt(false);
    manager.recordAttempt(false);

    expect(manager.getSuccessRate()).toBe(0);
    expect(manager.evaluateConnection(true)).toBe("unstable");
    expect(manager.getBackoffIntervalMs()).toBe(60_000);
  });

  it("uses the severe minimum interval when the success rate is below 20 percent", () => {
    const manager = buildManager();

    manager.recordAttempt(false);
    manager.recordAttempt(false);

    expect(manager.getSuccessRate()).toBe(0);
    expect(manager.getBackoffIntervalMs()).toBe(60_000);
  });

  it("waits for two bad observations before degrading the connection", () => {
    const manager = buildManager();

    manager.recordAttempt(false);
    expect(manager.evaluateConnection(true)).toBe("stable");

    manager.recordAttempt(false);
    expect(manager.evaluateConnection(true)).toBe("unstable");
  });

  it("keeps slow successful requests as reachable observations", () => {
    const manager = buildManager();

    manager.recordAttempt(true, 5_000);
    manager.recordAttempt(true, 5_000);

    expect(manager.evaluateConnection(true)).toBe("stable");
    expect(manager.getState().window).toEqual([
      expect.objectContaining({ success: true, durationMs: 5_000 }),
      expect.objectContaining({ success: true, durationMs: 5_000 })
    ]);
  });

  it("ignores a persisted degraded window after its quality history expires", () => {
    const now = new Date("2026-07-04T00:10:00.000Z");
    const store = new MemoryStore();
    const attemptedAt = new Date(
      now.getTime() - NETWORK_QUALITY_HISTORY_TTL_MS
    ).toISOString();
    store.state = {
      window: [
        { success: false, attemptedAt },
        { success: false, attemptedAt }
      ],
      consecutiveFailures: 2,
      consecutiveSuccesses: 0,
      backoffStep: 1,
      lastAttemptAt: attemptedAt,
      updatedAt: attemptedAt
    };
    const manager = new SyncManager(store, undefined, () => now);

    expect(manager.evaluateConnection(true)).toBe("stable");
    expect(manager.getState().window).toEqual([]);
    expect(manager.getBackoffIntervalMs()).toBe(0);
  });

  it("restores stable state after three consecutive successes", () => {
    const manager = buildManager();

    manager.recordAttempt(false);
    manager.recordAttempt(false);
    manager.recordAttempt(false);
    expect(manager.evaluateConnection(true)).toBe("unstable");

    manager.recordAttempt(true);
    manager.recordAttempt(true);
    const state = manager.recordAttempt(true);

    expect(manager.evaluateConnection(true)).toBe("stable");
    expect(state.backoffStep).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
  });

  it("returns no delay decision when NetInfo reports no connection", () => {
    const manager = buildManager();

    expect(manager.evaluateConnection(false)).toBe("none");
    expect(manager.getDelayUntilNextRunMs(false)).toBeNull();
  });

  it("records granular outcomes instead of one boolean per cycle", () => {
    const manager = buildManager();

    manager.recordOutcome(9, 1);

    expect(manager.getSuccessRate()).toBe(0.9);
    expect(manager.evaluateConnection(true)).toBe("stable");
  });

  it("resets persisted backoff after a fresh login", () => {
    const manager = buildManager();
    manager.recordOutcome(0, 4);

    const state = manager.resetState();

    expect(state.window).toEqual([]);
    expect(state.backoffStep).toBe(0);
    expect(manager.getDelayUntilNextRunMs(true)).toBe(0);
  });
});

function buildManager() {
  return new SyncManager(
    new MemoryStore(),
    undefined,
    () => new Date("2026-07-04T00:00:00.000Z")
  );
}
