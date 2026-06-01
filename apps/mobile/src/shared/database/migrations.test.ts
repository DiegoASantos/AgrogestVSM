import { describe, expect, it } from "vitest";

import { runMigrations } from "./migrations";

type FakeDatabase = {
  currentVersion: number;
  executedStatements: string[];
  productorColumns: Set<string>;
  execSync: (statement: string) => void;
  getAllSync: <T>(statement: string) => T[];
  getFirstSync: <T>(statement: string) => T | null;
  withTransactionSync: (callback: () => void) => void;
};

function createFakeDatabase(
  currentVersion: number,
  productorColumns: Iterable<string> = []
): FakeDatabase {
  return {
    currentVersion,
    executedStatements: [],
    productorColumns: new Set(productorColumns),
    execSync(statement) {
      this.executedStatements.push(statement);

      if (statement.startsWith("PRAGMA user_version = ")) {
        this.currentVersion = Number.parseInt(
          statement.replace("PRAGMA user_version = ", ""),
          10
        );
        return;
      }

      if (statement.startsWith("CREATE TABLE IF NOT EXISTS productores")) {
        this.productorColumns = new Set([
          "id",
          "public_id",
          "document_type_id",
          "document_number",
          "first_name",
          "last_name",
          "phone",
          "email",
          "address",
          "is_active",
          "created_at",
          "updated_at"
        ]);
        return;
      }

      if (statement.startsWith("ALTER TABLE productores ADD COLUMN ")) {
        const parts = statement.split(/\s+/u);
        const columnName = parts[5];

        if (!columnName) {
          throw new Error(`Could not parse column from statement: ${statement}`);
        }

        if (this.productorColumns.has(columnName)) {
          throw new Error(`Duplicate column: ${columnName}`);
        }

        this.productorColumns.add(columnName);
      }
    },
    getAllSync<T>(statement: string) {
      if (statement === "PRAGMA table_info(productores)") {
        return Array.from(this.productorColumns, (name) => ({ name })) as T[];
      }

      return [];
    },
    getFirstSync<T>(statement: string) {
      if (statement === "PRAGMA user_version") {
        return { user_version: this.currentVersion } as T;
      }

      return null;
    },
    withTransactionSync(callback) {
      callback();
    }
  };
}

describe("runMigrations", () => {
  it("skips duplicate productor name columns on a fresh install", () => {
    const db = createFakeDatabase(0);

    expect(() => runMigrations(db as never)).not.toThrow();
    expect(db.currentVersion).toBe(9);
    expect(db.executedStatements).not.toContain(
      "ALTER TABLE productores ADD COLUMN first_name TEXT"
    );
    expect(db.executedStatements).not.toContain(
      "ALTER TABLE productores ADD COLUMN last_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomist_recent ON visitas_campo(agronomist_user_id, created_at DESC)"
    );
  });

  it("adds missing productor name columns when upgrading an older database", () => {
    const db = createFakeDatabase(6, [
      "id",
      "public_id",
      "document_type_id",
      "document_number",
      "phone",
      "email",
      "address",
      "is_active",
      "created_at",
      "updated_at"
    ]);

    runMigrations(db as never);

    expect(db.currentVersion).toBe(9);
    expect(db.productorColumns.has("first_name")).toBe(true);
    expect(db.productorColumns.has("last_name")).toBe(true);
    expect(db.executedStatements).toContain(
      "ALTER TABLE productores ADD COLUMN first_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "ALTER TABLE productores ADD COLUMN last_name TEXT"
    );
    expect(db.executedStatements).toContain(
      "CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomist_recent ON visitas_campo(agronomist_user_id, created_at DESC)"
    );
  });
});
