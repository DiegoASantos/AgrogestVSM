import { getDatabase } from "../../../shared/database/connection";
import {
  getPendingOutboxEntries,
  insertSyncOutboxEntry
} from "../../../shared/database/sync-outbox";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import {
  SYNC_ENTITY_TABLES,
  type SyncEntityType
} from "../../../shared/sync/sync-entities";
import { debugLog } from "../../../shared/utils/debug-log";
import { getUserIdFromAccessToken } from "../../../shared/utils/auth-token";
import { evaluacionesRepository } from "../../evaluaciones/repositories/evaluaciones.repository";
import { observacionesSanitariasRepository } from "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { productosRecomendadosRepository } from "../../productos-recomendados/repositories/productos-recomendados.repository";
import { recomendacionesRepository } from "../../recomendaciones/repositories/recomendaciones.repository";
import { visitasCampoRepository } from "../repositories/visitas-campo.repository";
import type {
  CreateVisitaCampoDraft,
  VisitaCampoFull,
  VisitaSyncSummary
} from "../types";

type AuthToken = {
  accessToken: string;
  tokenType?: string | null;
};

export const visitasCampoService = {
  async create(draft: CreateVisitaCampoDraft, authToken: AuthToken) {
    const agronomistUserId = getUserIdFromAccessToken(authToken.accessToken);

    return visitasCampoRepository.insert({
      ...draft,
      agronomistUserId
    });
  },

  async getByParcelaId(parcelaId: string) {
    return visitasCampoRepository.getByParcelaId(parcelaId);
  },

  getRecentByAccessToken(accessToken: string, limit = 3) {
    const agronomistUserId = getUserIdFromAccessToken(accessToken);
    return visitasCampoRepository.getRecentByAgronomistUserId(
      agronomistUserId,
      limit
    );
  },

  getByAccessToken(accessToken: string) {
    const agronomistUserId = getUserIdFromAccessToken(accessToken);
    return visitasCampoRepository.getByAgronomistUserId(agronomistUserId);
  },

  getLastVisitDefaultsByParcelaId(parcelaId: string) {
    return visitasCampoRepository.getLastVisitDefaultsByParcelaId(parcelaId);
  },

  async getById(id: string) {
    const visita = visitasCampoRepository.getById(id);

    if (!visita) {
      throw new Error("No se encontro la visita solicitada.");
    }

    return visita;
  },

  async getFullVisita(localId: string): Promise<VisitaCampoFull | null> {
    const visita = visitasCampoRepository.getById(localId);

    if (!visita) {
      return null;
    }

    return {
      visita,
      evaluaciones: evaluacionesRepository.getByVisitaLocalId(localId),
      observacionesSanitarias:
        observacionesSanitariasRepository.getByVisitaLocalId(localId),
      recomendaciones: recomendacionesRepository.getByVisitaLocalId(localId),
      productosRecomendados:
        productosRecomendadosRepository.getByVisitaLocalId(localId)
    };
  },

  async getFullDetail(id: string): Promise<VisitaCampoFull> {
    const fullVisita = await this.getFullVisita(id);

    if (!fullVisita) {
      throw new Error("No se encontro la visita solicitada.");
    }

    return fullVisita;
  },

  getVisitaSyncSummary(localId: string): VisitaSyncSummary | null {
    const visita = visitasCampoRepository.getById(localId);

    if (!visita) {
      return null;
    }

    const evaluaciones = evaluacionesRepository.getByVisitaLocalId(localId);
    const observaciones =
      observacionesSanitariasRepository.getByVisitaLocalId(localId);
    const recomendaciones = recomendacionesRepository.getByVisitaLocalId(localId);
    const productos = productosRecomendadosRepository.getByVisitaLocalId(localId);

    const allStatuses = [
      visita.syncStatus,
      ...evaluaciones.map((evaluacion) => evaluacion.syncStatus),
      ...observaciones.map((observacion) => observacion.syncStatus),
      ...recomendaciones.map((recomendacion) => recomendacion.syncStatus),
      ...productos.map((producto) => producto.syncStatus)
    ];

    const totalEntities = allStatuses.length;
    const syncedCount = allStatuses.filter((status) => status === "synced").length;
    const pendingCount = allStatuses.filter((status) => status === "pending").length;
    const errorCount = allStatuses.filter((status) => status === "error").length;

    let overallStatus: VisitaSyncSummary["overallStatus"];

    if (errorCount > 0) {
      overallStatus = "error";
    } else if (syncedCount === totalEntities) {
      overallStatus = "synced";
    } else if (syncedCount > 0 && pendingCount > 0) {
      overallStatus = "partial";
    } else {
      overallStatus = "pending";
    }

    return {
      overallStatus,
      totalEntities,
      syncedCount,
      pendingCount,
      errorCount
    };
  },

  retrySyncForVisita(localId: string) {
    const visita = visitasCampoRepository.getById(localId);

    if (!visita) {
      return;
    }

    const evaluaciones = evaluacionesRepository.getByVisitaLocalId(localId);
    const observaciones =
      observacionesSanitariasRepository.getByVisitaLocalId(localId);
    const recomendaciones = recomendacionesRepository.getByVisitaLocalId(localId);
    const productos = productosRecomendadosRepository.getByVisitaLocalId(localId);

    type EntityToRetry = {
      entityType: SyncEntityType;
      localId: string;
      syncStatus: string;
    };

    const entitiesToRetry: EntityToRetry[] = [];

    if (visita.syncStatus === "error") {
      entitiesToRetry.push({
        entityType: "visitas_campo",
        localId: visita.id,
        syncStatus: visita.syncStatus
      });
    }

    for (const evaluacion of evaluaciones) {
      if (evaluacion.syncStatus === "error") {
        entitiesToRetry.push({
          entityType: "visita_evaluaciones",
          localId: evaluacion.id,
          syncStatus: evaluacion.syncStatus
        });
      }
    }

    for (const observacion of observaciones) {
      if (observacion.syncStatus === "error") {
        entitiesToRetry.push({
          entityType: "visita_observaciones_sanitarias",
          localId: observacion.id,
          syncStatus: observacion.syncStatus
        });
      }
    }

    for (const recomendacion of recomendaciones) {
      if (recomendacion.syncStatus === "error") {
        entitiesToRetry.push({
          entityType: "visita_recomendaciones",
          localId: recomendacion.id,
          syncStatus: recomendacion.syncStatus
        });
      }
    }

    for (const producto of productos) {
      if (producto.syncStatus === "error") {
        entitiesToRetry.push({
          entityType: "visita_productos_recomendados",
          localId: producto.id,
          syncStatus: producto.syncStatus
        });
      }
    }

    if (entitiesToRetry.length === 0) {
      return;
    }

    const pendingEntries = getPendingOutboxEntries();
    const pendingSet = new Set(
      pendingEntries.map((entry) => `${entry.entityType}:${entry.entityLocalId}`)
    );

    const db = getDatabase();

    db.withTransactionSync(() => {
      for (const entity of entitiesToRetry) {
        const key = `${entity.entityType}:${entity.localId}`;

        if (pendingSet.has(key)) {
          continue;
        }

        switch (entity.entityType) {
          case "visitas_campo":
            visitasCampoRepository.update(entity.localId, { syncStatus: "pending" });
            break;
          case "visita_evaluaciones":
            evaluacionesRepository.update(entity.localId, { syncStatus: "pending" });
            break;
          case "visita_observaciones_sanitarias":
            observacionesSanitariasRepository.update(entity.localId, {
              syncStatus: "pending"
            });
            break;
          case "visita_recomendaciones":
            recomendacionesRepository.update(entity.localId, { syncStatus: "pending" });
            break;
          case "visita_productos_recomendados":
            productosRecomendadosRepository.update(entity.localId, {
              syncStatus: "pending"
            });
            break;
        }

        const table = SYNC_ENTITY_TABLES[entity.entityType];

        if (table) {
          db.runSync(
            `UPDATE ${table} SET sync_error_message = NULL WHERE local_id = ?`,
            entity.localId
          );
        }

        const operation = entityHasServerId(entity.entityType, entity.localId)
          ? "update"
          : "create";

        insertSyncOutboxEntry(db, {
          entityType: entity.entityType,
          entityLocalId: entity.localId,
          operation,
          createdAt: getNowIsoString()
        });
      }
    });

    debugLog("Sync", `Manual retry queued for visita ${localId}`, {
      entities: entitiesToRetry.length
    });
  }
};

function entityHasServerId(entityType: SyncEntityType, localId: string): boolean {
  switch (entityType) {
    case "visitas_campo":
      return !!visitasCampoRepository.getById(localId)?.serverId;
    case "visita_evaluaciones":
      return !!evaluacionesRepository.getById(localId)?.serverId;
    case "visita_observaciones_sanitarias":
      return !!observacionesSanitariasRepository.getById(localId)?.serverId;
    case "visita_recomendaciones":
      return !!recomendacionesRepository.getById(localId)?.serverId;
    case "visita_productos_recomendados":
      return !!productosRecomendadosRepository.getById(localId)?.serverId;
    default:
      return false;
  }
}
