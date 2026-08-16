import { describe, expect, it, vi } from "vitest";

import { setCatalogSessionUserId } from "./catalog-session";

describe("setCatalogSessionUserId", () => {
  it("invalidates catalog freshness when the authenticated user changes", () => {
    const db = {
      getFirstSync: vi.fn(() => ({ value: "agronomo-anterior" })),
      runSync: vi.fn()
    };

    setCatalogSessionUserId(db as never, "agronomo-actual");

    expect(db.runSync).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM app_meta WHERE key = ?",
      "catalogs_downloaded_at"
    );
    expect(db.runSync).toHaveBeenCalledWith(
      "UPDATE sync_outbox SET owner_user_id = ? WHERE owner_user_id IS NULL",
      "agronomo-actual"
    );
    expect(db.runSync).toHaveBeenCalledWith(
      "UPDATE sync_failures SET owner_user_id = ? WHERE owner_user_id IS NULL",
      "agronomo-actual"
    );
    expect(db.runSync).toHaveBeenLastCalledWith(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      "catalog_session_user_id",
      "agronomo-actual"
    );
  });

  it("keeps catalog freshness for the same user", () => {
    const db = {
      getFirstSync: vi.fn(() => ({ value: "agronomo-1" })),
      runSync: vi.fn()
    };

    setCatalogSessionUserId(db as never, "agronomo-1");

    expect(db.runSync).toHaveBeenCalledTimes(3);
  });
});
