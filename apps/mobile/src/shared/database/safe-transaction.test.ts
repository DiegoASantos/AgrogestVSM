import { describe, expect, it, vi } from "vitest";

import { runInSafeTransactionSync } from "./safe-transaction";

describe("runInSafeTransactionSync", () => {
  it("preserves the original error when SQLite already closed the transaction", () => {
    let inTransaction = false;
    const original = new Error("validation details could not be stored");
    const db = {
      execSync: vi.fn((statement: string) => {
        if (statement === "BEGIN") inTransaction = true;
        if (statement === "COMMIT" || statement === "ROLLBACK") inTransaction = false;
      }),
      isInTransactionSync: vi.fn(() => inTransaction),
      withTransactionSync: vi.fn()
    };

    expect(() =>
      runInSafeTransactionSync(db as never, () => {
        inTransaction = false;
        throw original;
      })
    ).toThrow(original);
    expect(db.execSync).not.toHaveBeenCalledWith("ROLLBACK");
  });

  it("reuses an active transaction instead of nesting BEGIN", () => {
    const db = {
      execSync: vi.fn(),
      isInTransactionSync: vi.fn(() => true),
      withTransactionSync: vi.fn()
    };
    const task = vi.fn();

    runInSafeTransactionSync(db as never, task);

    expect(task).toHaveBeenCalledOnce();
    expect(db.execSync).not.toHaveBeenCalled();
  });

  it("does not commit again when the task already closed the transaction", () => {
    let inTransaction = false;
    const db = {
      execSync: vi.fn((statement: string) => {
        if (statement === "BEGIN") inTransaction = true;
        if (statement === "COMMIT" || statement === "ROLLBACK") {
          inTransaction = false;
        }
      }),
      isInTransactionSync: vi.fn(() => inTransaction),
      withTransactionSync: vi.fn()
    };

    expect(() =>
      runInSafeTransactionSync(db as never, () => {
        inTransaction = false;
      })
    ).not.toThrow();
    expect(db.execSync).toHaveBeenCalledWith("BEGIN");
    expect(db.execSync).not.toHaveBeenCalledWith("COMMIT");
    expect(db.execSync).not.toHaveBeenCalledWith("ROLLBACK");
  });
});
