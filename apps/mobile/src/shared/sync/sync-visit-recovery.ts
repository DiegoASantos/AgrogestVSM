import type { SQLiteDatabase } from "expo-sqlite";

import { getCatalogSessionUserId } from "../database/catalog-session";
import { getDatabase } from "../database/connection";
import { runInSafeTransactionSync } from "../database/safe-transaction";
import { getNowIsoString } from "../database/sqlite-utils";
import { notifySyncStatusChanged } from "./sync-events";

const VISIT_UPDATE_REPAIR_VERSION = "v1";

type RepairCandidate = {
  local_id: string;
};

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
