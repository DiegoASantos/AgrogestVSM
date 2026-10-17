import { beforeEach, describe, expect, it, vi } from "vitest";

const execSync = vi.fn();
const runMigrations = vi.fn();

vi.mock("expo-sqlite", () => ({
  openDatabaseSync: vi.fn(() => ({
    execSync
  }))
}));

vi.mock("./migrations", () => ({
  runMigrations
}));

describe("mobile database connection", () => {
  beforeEach(() => {
    execSync.mockReset();
    runMigrations.mockReset();
    vi.resetModules();
  });

  it("disables foreign keys only while migrations run", async () => {
    const { initDatabase } = await import("./connection");

    initDatabase();

    expect(execSync).toHaveBeenNthCalledWith(1, "PRAGMA journal_mode = WAL");
    expect(execSync).toHaveBeenNthCalledWith(2, "PRAGMA foreign_keys = ON");
    expect(execSync).toHaveBeenNthCalledWith(3, "PRAGMA foreign_keys = OFF");
    expect(runMigrations).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenLastCalledWith("PRAGMA foreign_keys = ON");
  });

  it("runs migrations on the first database access before returning the handle", async () => {
    const { getDatabase } = await import("./connection");

    getDatabase();

    expect(runMigrations).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenCalledWith("PRAGMA foreign_keys = OFF");
    expect(execSync).toHaveBeenLastCalledWith("PRAGMA foreign_keys = ON");
  });

  it("runs migrations only once across repeated database accesses", async () => {
    const { getDatabase } = await import("./connection");

    getDatabase();
    getDatabase();

    expect(runMigrations).toHaveBeenCalledTimes(1);
  });

  it("reenables foreign keys when migrations fail", async () => {
    runMigrations.mockImplementationOnce(() => {
      throw new Error("migration failed");
    });
    const { initDatabase } = await import("./connection");

    expect(() => initDatabase()).toThrow("migration failed");
    expect(execSync).toHaveBeenLastCalledWith("PRAGMA foreign_keys = ON");
  });
});
