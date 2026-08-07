import { describe, expect, it } from "vitest";

import { notifySyncStatusChanged, subscribeToSyncStatus } from "./sync-events";

describe("sync-events", () => {
  it("should subscribe and unsubscribe correctly", () => {
    let count = 0;
    const listener = () => { count++; };
    const unsubscribe = subscribeToSyncStatus(listener);
    notifySyncStatusChanged();
    expect(count).toBe(1);
    unsubscribe();
    notifySyncStatusChanged();
    expect(count).toBe(1);
  });

  it("should handle multiple listeners", () => {
    const calls: string[] = [];
    const unsub1 = subscribeToSyncStatus(() => calls.push("a"));
    const unsub2 = subscribeToSyncStatus(() => calls.push("b"));
    notifySyncStatusChanged();
    expect(calls).toEqual(["a", "b"]);
    unsub1();
    unsub2();
  });
});
