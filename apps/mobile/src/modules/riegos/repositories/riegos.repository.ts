import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import {
  fromSqliteBoolean,
  toSqliteBoolean,
  getNowIsoString
} from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  TipoRiegoCatalogItem,
  VisitaRiego,
  FuenteAgua,
  TipoSuelo,
  HumedadSuelo
} from "../types";

type SyncStatus = "pending" | "synced" | "error";

type TipoRiegoRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
};

type VisitaRiegoRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  tipo_riego_id: string;
  fuente_agua: string | null;
  tipo_suelo: string | null;
  humedad_suelo: string | null;
  estres_hidrico: number | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type CreateRiegoInput = {
  tipoRiegoId: string;
  fuenteAgua?: FuenteAgua | null;
  tipoSuelo?: TipoSuelo | null;
  humedadSuelo?: HumedadSuelo | null;
  estresHidrico?: boolean | null;
};

type UpdateRiegoInput = {
  tipoRiegoId?: string;
  fuenteAgua?: FuenteAgua | null;
  tipoSuelo?: TipoSuelo | null;
  humedadSuelo?: HumedadSuelo | null;
  estresHidrico?: boolean | null;
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const RIEGO_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  tipo_riego_id,
  fuente_agua,
  tipo_suelo,
  humedad_suelo,
  estres_hidrico,
  sync_status,
  created_at,
  updated_at
`;

export const riegosRepository = {
  getTiposRiego() {
    const db = getDatabase();
    const rows = db.getAllSync<TipoRiegoRow>(
      `SELECT id, name, description, is_active
       FROM tipos_riego
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    })) satisfies TipoRiegoCatalogItem[];
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaRiegoRow>(
      `SELECT ${RIEGO_COLUMNS}
       FROM visita_riegos
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapRiegoRow(row) : null;
  },

  getByVisitaLocalId(visitaLocalId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaRiegoRow>(
      `SELECT ${RIEGO_COLUMNS}
       FROM visita_riegos
       WHERE visita_local_id = ?
       LIMIT 1`,
      visitaLocalId
    );

    return row ? mapRiegoRow(row) : null;
  },

  getLastBySameParcelaBeforeVisita(visitaLocalId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<VisitaRiegoRow>(
      `SELECT ${RIEGO_COLUMNS.split(",")
        .map((column) => `riego.${column.trim()}`)
        .join(", ")}
       FROM visita_riegos riego
       INNER JOIN visitas_campo visita ON visita.local_id = riego.visita_local_id
       WHERE visita.parcela_id = (
         SELECT parcela_id
         FROM visitas_campo
         WHERE local_id = ?
         LIMIT 1
       )
         AND riego.visita_local_id <> ?
       ORDER BY visita.visit_date DESC, visita.created_at DESC
       LIMIT 1`,
      visitaLocalId,
      visitaLocalId
    );

    return row ? mapRiegoRow(row) : null;
  },

  insert(input: CreateRiegoInput, visitaLocalId: string) {
    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_riegos (
          local_id,
          server_id,
          visita_local_id,
          tipo_riego_id,
          fuente_agua,
          tipo_suelo,
          humedad_suelo,
          estres_hidrico,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        null,
        visitaLocalId,
        input.tipoRiegoId,
        input.fuenteAgua ?? null,
        input.tipoSuelo ?? null,
        input.humedadSuelo ?? null,
        toNullableSqliteBoolean(input.estresHidrico),
        "pending",
        timestamp,
        timestamp
      );
      insertSyncOutboxEntry(db, {
        entityType: "visita_riegos",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const riego = this.getById(localId);

    if (!riego) {
      throw new Error("No se pudo guardar el riego local.");
    }

    return riego;
  },

  update(localId: string, data: UpdateRiegoInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (data.tipoRiegoId !== undefined) {
      sets.push("tipo_riego_id = ?");
      params.push(data.tipoRiegoId);
    }

    if (data.fuenteAgua !== undefined) {
      sets.push("fuente_agua = ?");
      params.push(data.fuenteAgua);
    }

    if (data.tipoSuelo !== undefined) {
      sets.push("tipo_suelo = ?");
      params.push(data.tipoSuelo);
    }

    if (data.humedadSuelo !== undefined) {
      sets.push("humedad_suelo = ?");
      params.push(data.humedadSuelo);
    }

    if (data.estresHidrico !== undefined) {
      sets.push("estres_hidrico = ?");
      params.push(toNullableSqliteBoolean(data.estresHidrico));
    }

    if (data.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(data.serverId);
    }

    if (data.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(data.syncStatus);
    }

    sets.push("updated_at = ?");
    params.push(timestamp);
    params.push(localId);

    db.withTransactionSync(() => {
      const result = db.runSync(
        `UPDATE visita_riegos
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro el riego local para actualizar.");
      }

      const isSyncUpdate = data.syncStatus !== undefined || data.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          "UPDATE visita_riegos SET sync_status = 'pending' WHERE local_id = ?",
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_riegos",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const riego = this.getById(localId);

    if (!riego) {
      throw new Error("No se pudo leer el riego actualizado.");
    }

    return riego;
  },

  deleteById(localId: string) {
    const db = getDatabase();
    const existing = this.getById(localId);
    const payload = existing?.serverId
      ? JSON.stringify({ serverId: existing.serverId })
      : null;

    db.withTransactionSync(() => {
      insertSyncOutboxEntry(db, {
        entityType: "visita_riegos",
        entityLocalId: localId,
        operation: "delete",
        payload,
        createdAt: getNowIsoString()
      });

      const result = db.runSync(
        `DELETE FROM visita_riegos
         WHERE local_id = ?`,
        localId
      );

      if (result.changes < 1) {
        throw new Error("No se encontro el riego local para eliminar.");
      }
    });
  }
};

function mapRiegoRow(row: VisitaRiegoRow): VisitaRiego {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    tipoRiegoId: row.tipo_riego_id,
    fuenteAgua: row.fuente_agua as VisitaRiego["fuenteAgua"],
    tipoSuelo: row.tipo_suelo as VisitaRiego["tipoSuelo"],
    humedadSuelo: row.humedad_suelo as VisitaRiego["humedadSuelo"],
    estresHidrico: row.estres_hidrico === null ? null : row.estres_hidrico === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toNullableSqliteBoolean(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return toSqliteBoolean(value);
}
