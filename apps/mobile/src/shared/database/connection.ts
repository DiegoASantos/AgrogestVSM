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
  runMigrations(db);
  isInitialized = true;
  return db;
}
