import { afterEach, describe, expect, it, vi } from "vitest";

import { requestSync, subscribeToSyncRequests } from "./sync-requests";

describe("sync requests", () => {
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("notifies subscribers asynchronously and debounces pending requests", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToSyncRequests(listener);

    requestSync();
    requestSync();

    expect(listener).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not notify removed subscribers", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToSyncRequests(listener);

    requestSync();
    unsubscribe();
    vi.runOnlyPendingTimers();

    expect(listener).not.toHaveBeenCalled();
  });
});
