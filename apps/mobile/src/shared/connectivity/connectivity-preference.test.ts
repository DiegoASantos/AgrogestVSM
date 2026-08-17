import { describe, expect, it, vi } from "vitest";

vi.mock("../database/connection", () => ({ getDatabase: vi.fn() }));

import { getNetworkPreference, saveNetworkPreference } from "./connectivity-preference";

describe("network preference persistence", () => {
  it("defaults guests and unknown users to automatic", () => {
    const db = {
      getFirstSync: vi.fn(() => null)
    };

    expect(getNetworkPreference(null, db as never)).toBe("automatic");
    expect(getNetworkPreference("user-1", db as never)).toBe("automatic");
  });

  it("loads and stores the preference under a user-specific key", () => {
    const db = {
      getFirstSync: vi.fn(() => ({ value: "offline" })),
      runSync: vi.fn()
    };

    expect(getNetworkPreference("user-1", db as never)).toBe("offline");
    saveNetworkPreference("user-1", "automatic", db as never);

    expect(db.getFirstSync).toHaveBeenCalledWith(
      expect.stringContaining("FROM app_meta"),
      "network_preference:user-1"
    );
    expect(db.runSync).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      "network_preference:user-1",
      "automatic"
    );
  });
});
