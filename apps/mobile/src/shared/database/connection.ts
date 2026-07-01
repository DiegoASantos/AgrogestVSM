import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import { runMigrations } from "./migrations";

let database: SQLiteDatabase | null = null;
let isInitialized = false;

export function getDatabase() {
  if (!database) {
    database = openDatabaseSync("agrogest-vsm.db");
    database.execSync("PRAGMA journal_mode = WAL");
    database.execSync("PRAGMA foreign_keys = ON");
  }

  return database;
}

export function initDatabase() {
  if (isInitialized) {
    return getDatabase();
  }

  const db = getDatabase();
  db.execSync("PRAGMA foreign_keys = OFF");

  try {
    runMigrations(db);
    isInitialized = true;
  } finally {
    db.execSync("PRAGMA foreign_keys = ON");
  }

  return db;
}
