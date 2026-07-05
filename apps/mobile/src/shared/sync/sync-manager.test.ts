import { describe, expect, it } from "vitest";

import {
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
    expect(manager.getBackoffIntervalMs()).toBe(300_000);
  });

  it("uses the severe minimum interval when the success rate is below 20 percent", () => {
    const manager = buildManager();

    manager.recordAttempt(false);

    expect(manager.getSuccessRate()).toBe(0);
    expect(manager.getBackoffIntervalMs()).toBe(120_000);
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
});

function buildManager() {
  return new SyncManager(new MemoryStore(), undefined, () => new Date("2026-07-04T00:00:00.000Z"));
}
