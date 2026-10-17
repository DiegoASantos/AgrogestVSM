import { getDatabase } from "../../shared/database/connection";
import { getCatalogSessionUserId } from "../../shared/database/catalog-session";
import { insertSyncOutboxEntry } from "../../shared/database/sync-outbox";
import { deleteSyncFailureForEntity } from "../../shared/database/sync-failures";
import { getNowIsoString } from "../../shared/database/sqlite-utils";
import { apiRequest, type ApiRequestContext } from "../../shared/services";
import { generateLocalId, generatePublicId } from "../../shared/utils/local-id";
import type { GeoJsonPointGeometry } from "../../shared/maps/geo";

export type TipoSujetoComercial = "PERSONA" | "FUNDO" | "ASOCIATIVA" | "RECORREDOR";
export type VisitaComercialDraft = {
  tipoSujeto: TipoSujetoComercial;
  nombres: string;
  apellidos?: string | null;
  descripcion: string;
  fechaVisita: string;
  ubicacionVisita?: GeoJsonPointGeometry | null;
};
export type VisitaComercialLocal = VisitaComercialDraft & {
  id: string;
  publicId: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
};
type Row = {
  local_id: string;
  public_id: string;
  server_id: string | null;
  tipo_sujeto: TipoSujetoComercial;
  nombres: string;
  apellidos: string | null;
  descripcion: string;
  fecha_visita: string;
  ubicacion_visita: string | null;
  sync_status: "pending" | "synced" | "error";
  sync_error_message: string | null;
};
function map(row: Row): VisitaComercialLocal {
  return {
    id: row.local_id,
    publicId: row.public_id,
    serverId: row.server_id,
    tipoSujeto: row.tipo_sujeto,
    nombres: row.nombres,
    apellidos: row.apellidos,
    descripcion: row.descripcion,
    fechaVisita: row.fecha_visita,
    ubicacionVisita: row.ubicacion_visita
      ? (JSON.parse(row.ubicacion_visita) as GeoJsonPointGeometry)
      : null,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message
  };
}
export const visitasComercialesService = {
  create(draft: VisitaComercialDraft): VisitaComercialLocal {
    const db = getDatabase();
    const owner = getCatalogSessionUserId(db);
    if (!owner) throw new Error("Inicia sesión para registrar la visita.");
    const person = draft.tipoSujeto === "PERSONA" || draft.tipoSujeto === "RECORREDOR";
    if (
      !draft.nombres.trim() ||
      !draft.descripcion.trim() ||
      (person && !draft.apellidos?.trim())
    )
      throw new Error("Completa el nombre, los apellidos requeridos y la descripción.");
    const localId = generateLocalId();
    const publicId = generatePublicId();
    const now = getNowIsoString();
    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visitas_comerciales
          (local_id, public_id, owner_user_id, tipo_sujeto, nombres, apellidos,
           descripcion, fecha_visita, ubicacion_visita, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        publicId,
        owner,
        draft.tipoSujeto,
        draft.nombres.trim(),
        person ? draft.apellidos!.trim() : null,
        draft.descripcion.trim(),
        draft.fechaVisita,
        draft.ubicacionVisita ? JSON.stringify(draft.ubicacionVisita) : null,
        now,
        now
      );
      insertSyncOutboxEntry(db, {
        entityType: "visitas_comerciales",
        entityLocalId: localId,
        operation: "create",
        createdAt: now
      });
    });
    return this.getById(localId)!;
  },
  getById(id: string): VisitaComercialLocal | null {
    const db = getDatabase();
    const owner = getCatalogSessionUserId(db);
    if (!owner) return null;
    const row = db.getFirstSync<Row>(
      "SELECT * FROM visitas_comerciales WHERE local_id = ? AND owner_user_id = ?",
      id,
      owner
    );
    return row ? map(row) : null;
  },
  list(): VisitaComercialLocal[] {
    const db = getDatabase();
    const owner = getCatalogSessionUserId(db);
    if (!owner) return [];
    return db
      .getAllSync<Row>(
        "SELECT * FROM visitas_comerciales WHERE owner_user_id = ? ORDER BY fecha_visita DESC, created_at DESC",
        owner
      )
      .map(map);
  },
  markSynced(localId: string, serverId: string) {
    getDatabase().runSync(
      "UPDATE visitas_comerciales SET server_id = ?, sync_status = 'synced', sync_error_message = NULL WHERE local_id = ?",
      serverId,
      localId
    );
  },
  retry(id: string) {
    const visit = this.getById(id);
    if (!visit || visit.syncStatus !== "error") return false;
    const db = getDatabase();
    const now = getNowIsoString();
    db.withTransactionSync(() => {
      deleteSyncFailureForEntity(db, "visitas_comerciales", id);
      db.runSync(
        "UPDATE visitas_comerciales SET sync_status = 'pending', sync_error_message = NULL WHERE local_id = ?",
        id
      );
      insertSyncOutboxEntry(db, {
        entityType: "visitas_comerciales",
        entityLocalId: id,
        operation: "create",
        createdAt: now
      });
    });
    return true;
  }
};

export function createVisitaComercialRemote(
  draft: VisitaComercialDraft & { publicId: string },
  context: ApiRequestContext = {}
) {
  return apiRequest<{ id: string }>("/visitas-comerciales", {
    method: "POST",
    body: draft,
    ...context
  });
}
