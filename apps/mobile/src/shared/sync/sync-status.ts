import { getCatalogsDownloadedAt } from "../database/catalog-status";
import { getDatabase } from "../database/connection";
import {
  SYNC_ENTITY_TABLES,
  SYNC_ENTITY_TYPES,
  type SyncEntityType
} from "./sync-entities";
import type { SyncRunResult } from "./sync-result";

type SyncCountsResult = {
  pendingCount: number;
  errorCount: number;
};

export type SyncErrorDetail = {
  entityType: SyncEntityType;
  entityLabel: string;
  localId: string;
  message: string;
  updatedAt: string | null;
};

export type SyncPendingDetail = {
  entityType: SyncEntityType;
  entityLabel: string;
  localId: string;
  updatedAt: string | null;
};

const SYNC_ENTITY_LABELS: Record<SyncEntityType, string> = {
  visitas_campo: "Visita de campo",
  visita_evaluaciones: "Evaluacion",
  visita_observaciones_sanitarias: "Plagas y enfermedades",
  visita_paso_observaciones: "Nota de paso",
  visita_riegos: "Riego",
  visita_labores_culturales: "Labores culturales",
  visita_recetas: "Receta",
  visita_receta_fitosanidad: "Receta - fitosanidad",
  visita_receta_fertilizacion: "Receta - fertilizacion",
  visita_receta_riego: "Receta - riego",
  visita_receta_labores: "Receta - labores"
};

export function getSyncCounts(): SyncCountsResult {
  const db = getDatabase();

  let pendingCount = 0;
  let errorCount = 0;

  for (const table of SYNC_ENTITY_TYPES) {
    const row = db.getFirstSync<{ pending: number | null; error: number | null }>(
      `SELECT
        SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as error
       FROM ${table}`
    );

    if (row) {
      pendingCount += row.pending ?? 0;
      errorCount += row.error ?? 0;
    }
  }

  return { pendingCount, errorCount };
}

export function getSyncErrorDetails(): SyncErrorDetail[] {
  const db = getDatabase();
  const details: SyncErrorDetail[] = [];

  for (const entityType of SYNC_ENTITY_TYPES) {
    const table = SYNC_ENTITY_TABLES[entityType];
    const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    const hasErrorMessage = columns.some(
      (column) => column.name === "sync_error_message"
    );

    const rows = db.getAllSync<{
      local_id: string;
      sync_error_message?: string | null;
      updated_at: string | null;
    }>(
      `SELECT
        local_id,
        ${hasErrorMessage ? "sync_error_message" : "NULL as sync_error_message"},
        updated_at
       FROM ${table}
       WHERE sync_status = 'error'
       ORDER BY updated_at DESC, local_id ASC`
    );

    for (const row of rows) {
      details.push({
        entityType,
        entityLabel: SYNC_ENTITY_LABELS[entityType],
        localId: row.local_id,
        message:
          row.sync_error_message?.trim() ||
          "Sin detalle tecnico registrado. Reintenta la sincronizacion para capturar el mensaje actualizado.",
        updatedAt: row.updated_at
      });
    }
  }

  return details;
}

export function getSyncPendingDetails(): SyncPendingDetail[] {
  const db = getDatabase();
  const details: SyncPendingDetail[] = [];

  for (const entityType of SYNC_ENTITY_TYPES) {
    const table = SYNC_ENTITY_TABLES[entityType];

    const rows = db.getAllSync<{
      local_id: string;
      updated_at: string | null;
    }>(
      `SELECT local_id, updated_at
       FROM ${table}
       WHERE sync_status = 'pending'
       ORDER BY updated_at ASC, local_id ASC`
    );

    for (const row of rows) {
      details.push({
        entityType,
        entityLabel: SYNC_ENTITY_LABELS[entityType],
        localId: row.local_id,
        updatedAt: row.updated_at
      });
    }
  }

  return details;
}

export function getLastSyncTime(): string | null {
  const db = getDatabase();
  const result = db.getFirstSync<{ value: string }>(
    `SELECT value
     FROM app_meta
     WHERE key = ?
     LIMIT 1`,
    "last_sync_completed_at"
  );

  return result?.value ?? getCatalogsDownloadedAt();
}

export function setLastSyncTime(value: string) {
  getDatabase().runSync(
    `INSERT OR REPLACE INTO app_meta (key, value)
     VALUES (?, ?)`,
    "last_sync_completed_at",
    value
  );
}

export function getLastSyncAttempt(): SyncRunResult | null {
  const row = getDatabase().getFirstSync<{ value: string }>(
    `SELECT value
     FROM app_meta
     WHERE key = ?
     LIMIT 1`,
    "last_sync_attempt"
  );

  if (!row?.value) {
    return null;
  }

  try {
    return JSON.parse(row.value) as SyncRunResult;
  } catch {
    return null;
  }
}

export function setLastSyncAttempt(result: SyncRunResult) {
  getDatabase().runSync(
    `INSERT OR REPLACE INTO app_meta (key, value)
     VALUES (?, ?)`,
    "last_sync_attempt",
    JSON.stringify(result)
  );
}
