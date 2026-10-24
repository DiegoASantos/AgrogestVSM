import { File, Paths } from "expo-file-system";

import { limpiarFotosComercialesSincronizadas } from "../../modules/comercial/services/fotos-comerciales.service";
import { getDatabase } from "./connection";
import { runInSafeTransactionSync } from "./safe-transaction";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const TEMP_FILE_RETENTION_MS = CLEANUP_INTERVAL_MS;
const LAST_CLEANUP_KEY = "local_storage_cleanup_at";
const COMPACTION_PENDING_KEY = "local_storage_compaction_pending";

let cleanupInFlight: Promise<void> | null = null;

const EXPIRED_VISITS_SQL = `
  WITH recetas AS (
    SELECT local_id, visita_local_id, sync_status
    FROM visita_recetas
  ), mezclas AS (
    SELECT mezcla.local_id, receta.visita_local_id, mezcla.sync_status
    FROM visita_receta_mezcla mezcla
    JOIN recetas receta ON receta.local_id = mezcla.receta_local_id
  ), entidades_visita AS (
    SELECT local_id AS visita_local_id, 'visitas_campo' AS entity_type,
           local_id AS entity_local_id, sync_status
    FROM visitas_campo
    UNION ALL
    SELECT visita_local_id, 'visita_evaluaciones', local_id, sync_status
    FROM visita_evaluaciones
    UNION ALL
    SELECT visita_local_id, 'visita_observaciones_sanitarias', local_id, sync_status
    FROM visita_observaciones_sanitarias
    UNION ALL
    SELECT visita_local_id, 'visita_paso_observaciones', local_id, sync_status
    FROM visita_paso_observaciones
    UNION ALL
    SELECT visita_local_id, 'visita_riegos', local_id, sync_status
    FROM visita_riegos
    UNION ALL
    SELECT visita_local_id, 'visita_labores_culturales', local_id, sync_status
    FROM visita_labores_culturales
    UNION ALL
    SELECT visita_local_id, 'visita_calificaciones', local_id, sync_status
    FROM visita_calificaciones
    UNION ALL
    SELECT visita_local_id, 'visita_recetas', local_id, sync_status
    FROM recetas
    UNION ALL
    SELECT visita_local_id, 'visita_receta_mezcla', local_id, sync_status
    FROM mezclas
    UNION ALL
    SELECT receta.visita_local_id, 'visita_receta_fitosanidad', detalle.local_id,
           detalle.sync_status
    FROM visita_receta_fitosanidad detalle
    JOIN recetas receta ON receta.local_id = detalle.receta_local_id
    UNION ALL
    SELECT receta.visita_local_id, 'visita_receta_fertilizacion', detalle.local_id,
           detalle.sync_status
    FROM visita_receta_fertilizacion detalle
    JOIN recetas receta ON receta.local_id = detalle.receta_local_id
    UNION ALL
    SELECT receta.visita_local_id, 'visita_receta_riego', detalle.local_id,
           detalle.sync_status
    FROM visita_receta_riego detalle
    JOIN recetas receta ON receta.local_id = detalle.receta_local_id
    UNION ALL
    SELECT receta.visita_local_id, 'visita_receta_labores', detalle.local_id,
           detalle.sync_status
    FROM visita_receta_labores detalle
    JOIN recetas receta ON receta.local_id = detalle.receta_local_id
  )
  DELETE FROM visitas_campo
  WHERE local_id IN (
    SELECT visita.local_id
    FROM visitas_campo visita
    WHERE visita.visit_date < ?
      AND visita.sync_status = 'synced'
      AND NOT EXISTS (
        SELECT 1 FROM visit_form_drafts borrador
        WHERE borrador.scope_key = 'visit:' || visita.local_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM entidades_visita entidad
        WHERE entidad.visita_local_id = visita.local_id
          AND entidad.sync_status <> 'synced'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM entidades_visita entidad
        JOIN sync_outbox pendiente
          ON pendiente.entity_type = entidad.entity_type
         AND pendiente.entity_local_id = entidad.entity_local_id
        WHERE entidad.visita_local_id = visita.local_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM entidades_visita entidad
        JOIN sync_failures fallo
          ON fallo.entity_type = entidad.entity_type
         AND fallo.entity_local_id = entidad.entity_local_id
        WHERE entidad.visita_local_id = visita.local_id
      )
  )
`;

export function limpiarAlmacenamientoLocal(now = new Date()): Promise<void> {
  if (cleanupInFlight) return cleanupInFlight;

  cleanupInFlight = limpiarAlmacenamientoLocalInternal(now).finally(() => {
    cleanupInFlight = null;
  });
  return cleanupInFlight;
}

async function limpiarAlmacenamientoLocalInternal(now: Date) {
  const db = getDatabase();
  const lastCleanup = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
    LAST_CLEANUP_KEY
  )?.value;
  const lastCleanupAt = lastCleanup ? Date.parse(lastCleanup) : Number.NaN;
  if (
    Number.isFinite(lastCleanupAt) &&
    lastCleanupAt <= now.getTime() &&
    now.getTime() - lastCleanupAt < CLEANUP_INTERVAL_MS
  ) {
    return;
  }

  let deletedRows = 0;
  const cutoff = getVisitRetentionCutoff(now);

  runInSafeTransactionSync(db, () => {
    deletedRows += db.runSync(EXPIRED_VISITS_SQL, cutoff).changes;
    deletedRows += db.runSync(
      "DELETE FROM clima_parcela_cache WHERE expires_at <= ?",
      now.toISOString()
    ).changes;
    deletedRows += db.runSync(
      "DELETE FROM clima_distrito_cache WHERE expires_at <= ?",
      now.toISOString()
    ).changes;
    deletedRows += db.runSync(
      "DELETE FROM clima_estacion_cache WHERE expires_at <= ?",
      now.toISOString()
    ).changes;

    if (deletedRows > 0) {
      db.runSync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, '1')",
        COMPACTION_PENDING_KEY
      );
    }
  });

  await compactDatabaseIfNeeded(db);
  limpiarArchivosTemporalesAntiguos(now);
  limpiarFotosComercialesSincronizadas();
  db.runSync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    LAST_CLEANUP_KEY,
    now.toISOString()
  );
}

async function compactDatabaseIfNeeded(db: ReturnType<typeof getDatabase>) {
  const pending = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
    COMPACTION_PENDING_KEY
  )?.value;
  if (pending !== "1") return;

  if ("execAsync" in db && typeof db.execAsync === "function") {
    await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
  } else {
    db.execSync("PRAGMA wal_checkpoint(TRUNCATE);");
    db.execSync("VACUUM;");
  }

  db.runSync("DELETE FROM app_meta WHERE key = ?", COMPACTION_PENDING_KEY);
}

function limpiarArchivosTemporalesAntiguos(now: Date) {
  const oldestAllowed = now.getTime() - TEMP_FILE_RETENTION_MS;
  try {
    for (const entry of Paths.cache.list()) {
      if (!(entry instanceof File) || !/^[0-9a-f-]{36}\.jpg$/i.test(entry.name)) continue;
      const modifiedAt = entry.modificationTime;
      if (modifiedAt !== null && modifiedAt < oldestAllowed) {
        try {
          entry.delete();
        } catch {
          // El sistema puede retirar la cache o mantener un archivo temporal abierto.
        }
      }
    }
  } catch {
    // La cache temporal también es administrada por el sistema operativo.
  }
}

function getVisitRetentionCutoff(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day") - 90));
  return date.toISOString().slice(0, 10);
}
