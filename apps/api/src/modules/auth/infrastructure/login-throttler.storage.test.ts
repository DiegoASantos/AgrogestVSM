import { describe, expect, it, vi } from "vitest";
import { LoginThrottlerStorage } from "./login-throttler.storage";

describe("login throttler storage", () => {
  it("expires each counter independently and releases a block after one minute", async () => {
    vi.useFakeTimers();
    try {
      const storage = new LoginThrottlerStorage();
      const hit = (key: string) => storage.increment(key, 60_000, 5, 60_000, "default");
      for (let i = 0; i < 5; i++) await hit("blocked");
      expect((await hit("blocked")).isBlocked).toBe(true);
      await vi.advanceTimersByTimeAsync(30_000);
      await hit("other");
      await vi.advanceTimersByTimeAsync(30_000);
      expect((await hit("blocked")).isBlocked).toBe(false);
      expect((await hit("other")).totalHits).toBe(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect((await hit("other")).totalHits).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
