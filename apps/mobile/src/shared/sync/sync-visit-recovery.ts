import type { SQLiteDatabase } from "expo-sqlite";

import { getCatalogSessionUserId } from "../database/catalog-session";
import { getDatabase } from "../database/connection";
import { runInSafeTransactionSync } from "../database/safe-transaction";
import { getNowIsoString } from "../database/sqlite-utils";
import { addMinutesToVisitTime } from "../../modules/visitas-campo/domain/time-input";
import { notifySyncStatusChanged } from "./sync-events";

const VISIT_UPDATE_REPAIR_VERSION = "v1";
const LEGACY_FREQUENCY_RECOVERY = "missing_frequency_v1";
const MISSING_FREQUENCY_ERROR =
  /^Completa la frecuencia de dosis de la mezcla [1-9]\d*\.$/u;

type RepairCandidate = {
  local_id: string;
};

type LegacyFrequencyCandidate = {
  failure_id: number;
  error_message: string | null;
  failure_payload: string | null;
  operation: "create" | "update" | "delete";
  receta_local_id: string;
  receta_server_id: string | null;
  visita_local_id: string;
  visita_server_id: string | null;
  start_visit_time: string;
  visita_sync_status: "pending" | "synced" | "error";
};

type PendingOperation = { operation: "create" | "update" | "delete" };

export function isLegacyFrequencyRecoveryPayload(payload: string | null): boolean {
  if (!payload) return false;
  try {
    const value: unknown = JSON.parse(payload);
    return (
      typeof value === "object" &&
      value !== null &&
      "recovery" in value &&
      value.recovery === LEGACY_FREQUENCY_RECOVERY
    );
  } catch {
    return false;
  }
}

export function enqueueLegacyFrequencyRecovery(
  db: SQLiteDatabase = getDatabase()
): number {
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) return 0;

  const candidates = db.getAllSync<LegacyFrequencyCandidate>(
    `SELECT failure.id AS failure_id,
            failure.error_message,
            failure.payload AS failure_payload,
            failure.operation,
            receta.local_id AS receta_local_id,
            receta.server_id AS receta_server_id,
            visita.local_id AS visita_local_id,
            visita.server_id AS visita_server_id,
            visita.start_visit_time,
            visita.sync_status AS visita_sync_status
     FROM sync_failures AS failure
     INNER JOIN visita_recetas AS receta
       ON receta.local_id = failure.entity_local_id
     INNER JOIN visitas_campo AS visita
       ON visita.local_id = receta.visita_local_id
     WHERE failure.owner_user_id = ?
       AND failure.entity_type = 'visita_recetas'
       AND failure.error_kind = 'permanent'
       AND visita.agronomist_user_id = ?
       AND visita.is_active = 1
     ORDER BY failure.id ASC`,
    ownerUserId,
    ownerUserId
  );
  let queuedCount = 0;

  for (const candidate of candidates) {
    if (
      !MISSING_FREQUENCY_ERROR.test(candidate.error_message ?? "") ||
      isLegacyFrequencyRecoveryPayload(candidate.failure_payload) ||
      candidate.operation === "delete" ||
      candidate.visita_sync_status === "error"
    ) {
      continue;
    }

    const endVisitTime = addMinutesToVisitTime(candidate.start_visit_time, 10);
    if (!endVisitTime) continue;

    runInSafeTransactionSync(db, () => {
      const currentFailure = db.getFirstSync<{ error_message: string | null }>(
        `SELECT error_message FROM sync_failures
         WHERE id = ? AND owner_user_id = ?
           AND entity_type = 'visita_recetas'
           AND entity_local_id = ? AND error_kind = 'permanent'`,
        candidate.failure_id,
        ownerUserId,
        candidate.receta_local_id
      );
      if (currentFailure?.error_message !== candidate.error_message) return;

      const parentFailure = db.getFirstSync<{ id: number }>(
        `SELECT id FROM sync_failures
         WHERE owner_user_id = ? AND entity_type = 'visitas_campo'
           AND entity_local_id = ? LIMIT 1`,
        ownerUserId,
        candidate.visita_local_id
      );
      if (parentFailure) return;

      const parentOutbox = db.getFirstSync<PendingOperation>(
        `SELECT operation FROM sync_outbox
         WHERE owner_user_id = ? AND entity_type = 'visitas_campo'
           AND entity_local_id = ? ORDER BY id ASC LIMIT 1`,
        ownerUserId,
        candidate.visita_local_id
      );
      const recipeOutbox = db.getFirstSync<PendingOperation>(
        `SELECT operation FROM sync_outbox
         WHERE owner_user_id = ? AND entity_type = 'visita_recetas'
           AND entity_local_id = ? ORDER BY id ASC LIMIT 1`,
        ownerUserId,
        candidate.receta_local_id
      );
      if (parentOutbox?.operation === "delete" || recipeOutbox?.operation === "delete") {
        return;
      }

      const queuedAt = getNowIsoString();
      const visitUpdate = db.runSync(
        `UPDATE visitas_campo
         SET end_visit_time = ?, sync_status = 'pending', updated_at = ?
         WHERE local_id = ? AND agronomist_user_id = ? AND is_active = 1`,
        endVisitTime,
        queuedAt,
        candidate.visita_local_id,
        ownerUserId
      );
      if (visitUpdate.changes !== 1) {
        throw new Error("No se pudo preparar la visita para recuperar su receta.");
      }
      if (!parentOutbox) {
        db.runSync(
          `INSERT INTO sync_outbox
           (owner_user_id, entity_type, entity_local_id, operation, payload, created_at)
           VALUES (?, 'visitas_campo', ?, ?, NULL, ?)`,
          ownerUserId,
          candidate.visita_local_id,
          candidate.visita_server_id ? "update" : "create",
          queuedAt
        );
      }

      const payload = JSON.stringify({
        recovery: LEGACY_FREQUENCY_RECOVERY,
        visitaLocalId: candidate.visita_local_id
      });
      if (recipeOutbox) {
        db.runSync(
          `UPDATE sync_outbox SET payload = ?
           WHERE owner_user_id = ? AND entity_type = 'visita_recetas'
             AND entity_local_id = ?`,
          payload,
          ownerUserId,
          candidate.receta_local_id
        );
      } else {
        db.runSync(
          `INSERT INTO sync_outbox
           (owner_user_id, entity_type, entity_local_id, operation, payload, created_at)
           VALUES (?, 'visita_recetas', ?, ?, ?, ?)`,
          ownerUserId,
          candidate.receta_local_id,
          candidate.receta_server_id ? "update" : "create",
          payload,
          queuedAt
        );
      }
      const recipeUpdate = db.runSync(
        `UPDATE visita_recetas
         SET sync_status = 'pending', sync_error_message = NULL, updated_at = ?
         WHERE local_id = ? AND visita_local_id = ?`,
        queuedAt,
        candidate.receta_local_id,
        candidate.visita_local_id
      );
      if (recipeUpdate.changes !== 1) {
        throw new Error("No se pudo preparar la receta para sincronizar.");
      }
      db.runSync(
        `DELETE FROM sync_failures WHERE id = ? AND owner_user_id = ?`,
        candidate.failure_id,
        ownerUserId
      );
      queuedCount++;
    });
  }

  if (queuedCount > 0) notifySyncStatusChanged();
  return queuedCount;
}

export function enqueueVisitaUpdateRepairOnce(
  db: SQLiteDatabase = getDatabase()
): number {
  const ownerUserId = getCatalogSessionUserId(db);

  if (!ownerUserId) {
    return 0;
  }

  const markerKey = `sync_visit_update_repair_${VISIT_UPDATE_REPAIR_VERSION}:${ownerUserId}`;
  let queuedCount = 0;

  runInSafeTransactionSync(db, () => {
    const completed = db.getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
      markerKey
    );

    if (completed) {
      return;
    }

    const candidates = db.getAllSync<RepairCandidate>(
      `SELECT visita.local_id
       FROM visitas_campo AS visita
       WHERE visita.agronomist_user_id = ?
         AND visita.is_active = 1
         AND visita.server_id IS NOT NULL
         AND visita.sync_status <> 'error'
         AND NOT EXISTS (
           SELECT 1
           FROM sync_outbox AS pending
           WHERE pending.owner_user_id = ?
             AND pending.entity_type = 'visitas_campo'
             AND pending.entity_local_id = visita.local_id
         )
         AND NOT EXISTS (
           SELECT 1
           FROM sync_failures AS failure
           WHERE failure.owner_user_id = ?
             AND failure.entity_type = 'visitas_campo'
             AND failure.entity_local_id = visita.local_id
         )
       ORDER BY visita.created_at ASC, visita.local_id ASC`,
      ownerUserId,
      ownerUserId,
      ownerUserId
    );
    const queuedAt = getNowIsoString();

    for (const candidate of candidates) {
      db.runSync(
        `INSERT INTO sync_outbox (
           owner_user_id, entity_type, entity_local_id, operation, payload, created_at
         ) VALUES (?, 'visitas_campo', ?, 'update', NULL, ?)`,
        ownerUserId,
        candidate.local_id,
        queuedAt
      );
      db.runSync(
        `UPDATE visitas_campo
         SET sync_status = 'pending'
         WHERE local_id = ? AND agronomist_user_id = ?`,
        candidate.local_id,
        ownerUserId
      );
    }

    db.runSync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      markerKey,
      queuedAt
    );
    queuedCount = candidates.length;
  });

  if (queuedCount > 0) {
    notifySyncStatusChanged();
  }

  return queuedCount;
}
