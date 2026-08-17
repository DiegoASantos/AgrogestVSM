import { getCatalogsDownloadedAt } from "../database/catalog-status";
import { getDatabase } from "../database/connection";
import { getCatalogSessionUserId } from "../database/catalog-session";
import { getSyncFailures } from "../database/sync-failures";
import {
  SYNC_ENTITY_TABLES,
  SYNC_ENTITY_TYPES,
  type SyncEntityType
} from "./sync-entities";
import type { SyncRunResult } from "./sync-result";
import { notifySyncStatusChanged, subscribeToSyncStatus } from "./sync-events";
import { isRecoverableCatalogEntity } from "./catalog-sync-recovery";

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
  retryable: boolean;
  errorKind: "transient" | "permanent" | "legacy";
  displayName?: string | null;
  canRetryCatalog?: boolean;
  canDiscardCatalog?: boolean;
};

export type SyncPendingDetail = {
  entityType: SyncEntityType;
  entityLabel: string;
  localId: string;
  updatedAt: string | null;
};

const SYNC_ENTITY_LABELS: Record<SyncEntityType, string> = {
  productores: "Productor",
  sectores: "Sector",
  subsectores: "Subsector",
  parcelas: "Parcela",
  ingredientes_activos: "Ingrediente activo",
  fertilizantes: "Fertilizante",
  marcas_producto: "Marca de producto",
  visitas_campo: "Visita de campo",
  visita_evaluaciones: "Evaluacion",
  visita_observaciones_sanitarias: "Plagas y enfermedades",
  visita_paso_observaciones: "Nota de paso",
  visita_riegos: "Riego",
  visita_labores_culturales: "Labores culturales",
  visita_recetas: "Receta",
  visita_receta_fitosanidad: "Receta - fitosanidad",
  visita_receta_mezcla: "Receta - mezcla",
  visita_receta_fertilizacion: "Receta - fertilizacion",
  visita_receta_riego: "Receta - riego",
  visita_receta_labores: "Receta - labores",
  visita_calificaciones: "Calificacion de cumplimiento"
};

const CATALOG_SYNC_ENTITY_TYPES = new Set<SyncEntityType>([
  "productores",
  "sectores",
  "subsectores",
  "parcelas",
  "ingredientes_activos",
  "fertilizantes",
  "marcas_producto"
]);

export function getSyncCounts(): SyncCountsResult {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);

  if (!ownerUserId) {
    return { pendingCount: 0, errorCount: 0 };
  }

  const pendingCount =
    db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_outbox WHERE owner_user_id = ?`,
      ownerUserId
    )?.count ?? 0;
  let errorCount =
    db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_failures WHERE owner_user_id = ?`,
      ownerUserId
    )?.count ?? 0;

  for (const entityType of SYNC_ENTITY_TYPES) {
    const table = SYNC_ENTITY_TABLES[entityType];
    const idColumn = getSyncEntityIdColumn(entityType);
    const row = db.getFirstSync<{ error: number | null }>(
      `SELECT COUNT(*) as error
       FROM ${table}
       WHERE sync_status = 'error'
         AND NOT EXISTS (
           SELECT 1 FROM sync_failures
           WHERE entity_type = ? AND entity_local_id = ${table}.${idColumn}
         )`,
      entityType
    );

    if (row) {
      errorCount += row.error ?? 0;
    }
  }

  return { pendingCount, errorCount };
}

export function getSyncErrorDetails(): SyncErrorDetail[] {
  const db = getDatabase();
  const details: SyncErrorDetail[] = getSyncFailures().map((failure) => {
    const catalog = getCatalogFailureMetadata(
      db,
      failure.entityType,
      failure.entityLocalId
    );

    return {
      entityType: failure.entityType,
      entityLabel: SYNC_ENTITY_LABELS[failure.entityType],
      localId: failure.entityLocalId,
      message: failure.errorMessage?.trim() || "Fallo de sincronizacion sin detalle.",
      updatedAt: failure.failedAt,
      retryable: failure.errorKind === "transient",
      errorKind: failure.errorKind,
      ...catalog
    };
  });

  for (const entityType of SYNC_ENTITY_TYPES) {
    const table = SYNC_ENTITY_TABLES[entityType];
    const idColumn = getSyncEntityIdColumn(entityType);
    const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    const hasErrorMessage = columns.some(
      (column) => column.name === "sync_error_message"
    );
    const hasUpdatedAt = columns.some((column) => column.name === "updated_at");
    const updatedAtSelection = hasUpdatedAt
      ? `${table}.updated_at AS updated_at`
      : "NULL AS updated_at";
    const orderBy = hasUpdatedAt
      ? `${table}.updated_at DESC, ${table}.${idColumn} ASC`
      : `${table}.${idColumn} ASC`;

    const rows = db.getAllSync<{
      local_id: string;
      sync_error_message?: string | null;
      updated_at: string | null;
    }>(
      `SELECT
        ${idColumn} AS local_id,
        ${hasErrorMessage ? "sync_error_message" : "NULL as sync_error_message"},
        ${updatedAtSelection}
       FROM ${table}
       WHERE sync_status = 'error'
         AND NOT EXISTS (
           SELECT 1 FROM sync_failures
           WHERE entity_type = ? AND entity_local_id = ${table}.${idColumn}
         )
       ORDER BY ${orderBy}`,
      entityType
    );

    for (const row of rows) {
      details.push({
        entityType,
        entityLabel: SYNC_ENTITY_LABELS[entityType],
        localId: row.local_id,
        message:
          row.sync_error_message?.trim() ||
          "Sin detalle tecnico registrado. Reintenta la sincronizacion para capturar el mensaje actualizado.",
        updatedAt: row.updated_at,
        retryable: false,
        errorKind: "legacy",
        ...getCatalogFailureMetadata(db, entityType, row.local_id, false)
      });
    }
  }

  return details;
}

function getCatalogFailureMetadata(
  db: ReturnType<typeof getDatabase>,
  entityType: SyncEntityType,
  localId: string,
  allowRecovery = true
) {
  if (!isRecoverableCatalogEntity(entityType)) {
    return {};
  }

  const row = db.getFirstSync<{ name: string; server_id: string | null }>(
    `SELECT name, server_id FROM ${SYNC_ENTITY_TABLES[entityType]}
     WHERE id = ? LIMIT 1`,
    localId
  );
  if (!row) {
    return { canRetryCatalog: false, canDiscardCatalog: false };
  }

  const hasPendingBrandDependency =
    entityType === "ingredientes_activos" &&
    Boolean(
      db.getFirstSync<{ id: string }>(
        `SELECT id FROM marcas_producto
         WHERE ingrediente_activo_id = ?
           AND sync_status IN ('pending', 'error')
         LIMIT 1`,
        localId
      )
    );

  return {
    displayName: row.name,
    canRetryCatalog: allowRecovery,
    canDiscardCatalog: allowRecovery && !row.server_id && !hasPendingBrandDependency
  };
}

export function getSyncPendingDetails(): SyncPendingDetail[] {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);

  if (!ownerUserId) {
    return [];
  }

  const rows = db.getAllSync<{
    entity_type: SyncEntityType;
    entity_local_id: string;
    created_at: string;
  }>(
    `SELECT entity_type, entity_local_id, created_at
     FROM sync_outbox
     WHERE owner_user_id = ?
     ORDER BY CASE WHEN entity_type = 'visitas_campo' THEN 0 ELSE 1 END,
              id ASC`,
    ownerUserId
  );

  return rows.map((row) => ({
    entityType: row.entity_type,
    entityLabel: SYNC_ENTITY_LABELS[row.entity_type],
    localId: row.entity_local_id,
    updatedAt: row.created_at
  }));
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
  notifySyncStatusChanged();
}

function getSyncEntityIdColumn(entityType: SyncEntityType): "id" | "local_id" {
  return CATALOG_SYNC_ENTITY_TYPES.has(entityType) ? "id" : "local_id";
}

export { notifySyncStatusChanged, subscribeToSyncStatus };
