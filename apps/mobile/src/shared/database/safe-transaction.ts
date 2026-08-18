import type { SQLiteDatabase } from "expo-sqlite";

export function runInSafeTransactionSync(db: SQLiteDatabase, task: () => void): void {
  if (typeof db.isInTransactionSync !== "function" || typeof db.execSync !== "function") {
    db.withTransactionSync(task);
    return;
  }

  if (db.isInTransactionSync()) {
    task();
    return;
  }

  db.execSync("BEGIN");
  try {
    task();
    if (db.isInTransactionSync()) {
      db.execSync("COMMIT");
    }
  } catch (error) {
    if (db.isInTransactionSync()) {
      try {
        db.execSync("ROLLBACK");
      } catch {
        // El error original conserva prioridad sobre un fallo secundario de rollback.
      }
    }
    throw error;
  }
}
