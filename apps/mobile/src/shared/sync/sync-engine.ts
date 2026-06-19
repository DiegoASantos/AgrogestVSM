import { evaluacionesRepository } from "../../modules/evaluaciones/repositories/evaluaciones.repository";
import { laboresCulturalesVisitaRepository } from "../../modules/labores-culturales-visita/repositories/labores-culturales-visita.repository";
import { observacionesSanitariasRepository } from "../../modules/observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { visitaStepNotesRepository } from "../../modules/observaciones-sanitarias/repositories/visita-step-notes.repository";
import { riegosRepository } from "../../modules/riegos/repositories/riegos.repository";
import { visitaRecetasRepository } from "../../modules/visita-recetas/repositories/visita-recetas.repository";
import { visitasCampoRepository } from "../../modules/visitas-campo/repositories/visitas-campo.repository";
import {
  deleteOutboxEntry,
  incrementOutboxRetryCount,
  getPendingOutboxEntries,
  type SyncOutboxItem
} from "../database/sync-outbox";
import { getDatabase } from "../database/connection";
import { getNowIsoString } from "../database/sqlite-utils";
import { getApiToken } from "../services/api/auth-store";
import { ApiError } from "../services/api/errors";
import { debugLog } from "../utils/debug-log";
import { classifyError } from "./sync-errors";
import { SYNC_ENTITY_TABLES } from "./sync-entities";
import { entityHandlerMap } from "./sync-handlers";
import { setLastSyncTime } from "./sync-status";

const MAX_RETRIES = 5;
const RECONCILABLE_SYNC_ENTITIES: Array<{
  entityType: keyof typeof SYNC_ENTITY_TABLES;
  table: string;
}> = [
  { entityType: "visitas_campo", table: "visitas_campo" },
  { entityType: "visita_evaluaciones", table: "visita_evaluaciones" },
  {
    entityType: "visita_observaciones_sanitarias",
    table: "visita_observaciones_sanitarias"
  },
  { entityType: "visita_paso_observaciones", table: "visita_paso_observaciones" },
  { entityType: "visita_riegos", table: "visita_riegos" },
  { entityType: "visita_labores_culturales", table: "visita_labores_culturales" },
  { entityType: "visita_recetas", table: "visita_recetas" }
];

export async function processOutbox(): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  const token = getApiToken();

  if (!token) {
    return { processed: 0, skipped: 0, errors: 0 };
  }

  reconcilePendingOutboxEntries();

  const entries = getPendingOutboxEntries();
  if (entries.length > 0) {
    debugLog("Sync", `Starting cycle with ${entries.length} outbox entries`);
  }
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const failedVisitaIds = new Set<string>();
  let stoppedByAuth = false;

  for (const entry of entries) {
    const isChildEntity = entry.entityType !== "visitas_campo";
    const isChildCreate = isChildEntity && entry.operation === "create";

    if (isChildCreate) {
      const childVisitaLocalId = getChildVisitaLocalId(entry);

      if (childVisitaLocalId && failedVisitaIds.has(childVisitaLocalId)) {
        skipped++;
        continue;
      }
    }

    const handler = entityHandlerMap[entry.entityType];

    if (!handler) {
      console.warn(
        `No sync handler for entity type: ${entry.entityType}. Removing orphaned entry.`
      );
      deleteOutboxEntry(entry.id);
      skipped++;
      continue;
    }

    try {
      const result = await handler(entry);

      if (result.status === "synced" || result.status === "deleted_local") {
        deleteOutboxEntry(entry.id);
        processed++;
      } else if (result.status === "skipped") {
        skipped++;
      }
    } catch (error) {
      const classified = classifyError(error);

      if (classified.kind === "auth") {
        console.warn("Auth error during sync. Stopping.");
        stoppedByAuth = true;
        break;
      }

      if (classified.kind === "conflict") {
        handleConflictResolution(entry, error);
        deleteOutboxEntry(entry.id);
        processed++;
        continue;
      }

      if (classified.kind === "transient") {
        incrementOutboxRetryCount(entry.id);

        if (entry.retryCount + 1 >= MAX_RETRIES) {
          console.warn(
            `[Sync] Entry ${entry.id} (${entry.entityType}) exhausted ${MAX_RETRIES} retries: ${classified.message}`
          );
          markEntityError(
            entry,
            `Fallo tras ${MAX_RETRIES} intentos: ${classified.message}`
          );
          deleteOutboxEntry(entry.id);
          errors++;
        } else {
          if (entry.entityType === "visitas_campo") {
            failedVisitaIds.add(entry.entityLocalId);
          }

          skipped++;
        }
        continue;
      }

      if (entry.entityType === "visitas_campo") {
        failedVisitaIds.add(entry.entityLocalId);
      }

      console.warn(
        `[Sync] Permanent error for ${entry.entityType}:${entry.entityLocalId}: ${classified.message}`
      );
      markEntityError(entry, classified.message);
      deleteOutboxEntry(entry.id);
      errors++;
    }
  }

  if (!stoppedByAuth) {
    setLastSyncTime(getNowIsoString());
  }

  return { processed, skipped, errors };
}

function handleConflictResolution(entry: SyncOutboxItem, error: unknown) {
  if (!(error instanceof ApiError) || !error.responseData) {
    return;
  }

  const data = error.responseData as { id?: string; publicId?: string };

  if (!data.id) {
    return;
  }

  debugLog("Sync", `Conflict resolved for ${entry.entityType}:${entry.entityLocalId}`, {
    serverId: data.id
  });

  try {
    if (entry.entityType === "visitas_campo") {
      visitasCampoRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced",
        synchronizedAt: getNowIsoString(),
        publicId: data.publicId ?? undefined
      });
    } else if (entry.entityType === "visita_evaluaciones") {
      evaluacionesRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced"
      });
    } else if (entry.entityType === "visita_observaciones_sanitarias") {
      observacionesSanitariasRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced"
      });
    } else if (entry.entityType === "visita_paso_observaciones") {
      visitaStepNotesRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced"
      });
    } else if (entry.entityType === "visita_riegos") {
      riegosRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced"
      });
    } else if (entry.entityType === "visita_labores_culturales") {
      laboresCulturalesVisitaRepository.update(entry.entityLocalId, {
        serverId: data.id,
        syncStatus: "synced"
      });
    }
  } catch {
    // Entity may not exist (was deleted locally)
  }
}

function getChildVisitaLocalId(entry: SyncOutboxItem): string | null {
  switch (entry.entityType) {
    case "visita_evaluaciones":
      return evaluacionesRepository.getById(entry.entityLocalId)?.visitaId ?? null;
    case "visita_observaciones_sanitarias":
      return (
        observacionesSanitariasRepository.getById(entry.entityLocalId)?.visitaId ?? null
      );
    case "visita_paso_observaciones":
      return visitaStepNotesRepository.getById(entry.entityLocalId)?.visitaId ?? null;
    case "visita_riegos":
      return riegosRepository.getById(entry.entityLocalId)?.visitaId ?? null;
    case "visita_labores_culturales":
      return (
        laboresCulturalesVisitaRepository.getById(entry.entityLocalId)?.visitaId ?? null
      );
    case "visita_recetas":
      return (
        visitaRecetasRepository.getRecetaByLocalId(entry.entityLocalId)?.visitaLocalId ??
        visitaRecetasRepository.getRecetaByVisitaLocalId(entry.entityLocalId)
          ?.visitaLocalId ??
        null
      );
    default:
      return null;
  }
}

function markEntityError(entry: SyncOutboxItem, message: string) {
  const table = SYNC_ENTITY_TABLES[entry.entityType];

  if (!table) {
    return;
  }

  try {
    switch (entry.entityType) {
      case "visitas_campo":
        visitasCampoRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_evaluaciones":
        evaluacionesRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_observaciones_sanitarias":
        observacionesSanitariasRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_paso_observaciones":
        visitaStepNotesRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_riegos":
        riegosRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_labores_culturales":
        laboresCulturalesVisitaRepository.update(entry.entityLocalId, {
          syncStatus: "error"
        });
        break;
      case "visita_recetas":
        getDatabase().runSync(
          `UPDATE visita_recetas
           SET sync_status = 'error'
           WHERE local_id = ? OR visita_local_id = ?`,
          entry.entityLocalId,
          entry.entityLocalId
        );
        break;
      default:
        return;
    }

    getDatabase().runSync(
      `UPDATE ${table} SET sync_error_message = ? WHERE local_id = ?`,
      message,
      entry.entityLocalId
    );
  } catch {
    // El registro puede no existir si era un delete local ya aplicado.
  }
}

function reconcilePendingOutboxEntries() {
  const db = getDatabase();
  const timestamp = getNowIsoString();

  db.runSync(`
    UPDATE visita_recetas
    SET sync_status = 'pending'
    WHERE local_id IN (
      SELECT receta_local_id FROM visita_receta_fitosanidad WHERE sync_status = 'pending'
      UNION
      SELECT receta_local_id FROM visita_receta_fertilizacion WHERE sync_status = 'pending'
      UNION
      SELECT receta_local_id FROM visita_receta_riego WHERE sync_status = 'pending'
      UNION
      SELECT receta_local_id FROM visita_receta_labores WHERE sync_status = 'pending'
    )
  `);

  for (const entity of RECONCILABLE_SYNC_ENTITIES) {
    const rows =
      entity.entityType === "visita_recetas"
        ? db.getAllSync<{ local_id: string; server_id: string | null }>(
            `SELECT local_id, server_id
             FROM visita_recetas
             WHERE sync_status = 'pending'
               AND NOT EXISTS (
                 SELECT 1
                 FROM sync_outbox
                 WHERE entity_type = ?
                   AND entity_local_id IN (
                     visita_recetas.local_id,
                     visita_recetas.visita_local_id
                   )
               )`,
            entity.entityType
          )
        : db.getAllSync<{ local_id: string; server_id: string | null }>(
            `SELECT local_id, server_id
             FROM ${entity.table}
             WHERE sync_status = 'pending'
               AND NOT EXISTS (
                 SELECT 1
                 FROM sync_outbox
                 WHERE entity_type = ?
                   AND entity_local_id = ${entity.table}.local_id
               )`,
            entity.entityType
          );

    for (const row of rows) {
      db.runSync(
        `INSERT INTO sync_outbox
           (entity_type, entity_local_id, operation, payload, created_at)
         VALUES (?, ?, ?, NULL, ?)`,
        entity.entityType,
        row.local_id,
        row.server_id ? "update" : "create",
        timestamp
      );
    }
  }
}
