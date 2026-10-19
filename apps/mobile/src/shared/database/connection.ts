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

  ensureDatabaseInitialized(database);
  return database;
}

export function initDatabase() {
  return getDatabase();
}

function ensureDatabaseInitialized(db: SQLiteDatabase) {
  if (isInitialized) return;

  db.execSync("PRAGMA foreign_keys = OFF");

  try {
    runMigrations(db);
    isInitialized = true;
  } finally {
    db.execSync("PRAGMA foreign_keys = ON");
  }
}
