import { getDatabase } from "../../shared/database/connection";
import { getCatalogSessionUserId } from "../../shared/database/catalog-session";
import { insertSyncOutboxEntry } from "../../shared/database/sync-outbox";
import { deleteSyncFailureForEntity } from "../../shared/database/sync-failures";
import { getNowIsoString } from "../../shared/database/sqlite-utils";
import { apiRequest, type ApiRequestContext } from "../../shared/services";
import { generateLocalId, generatePublicId } from "../../shared/utils/local-id";
import type { GeoJsonPointGeometry } from "../../shared/maps/geo";
import { productoresRepository } from "../productores/repositories/productores.repository";
import type { Productor } from "../productores/types";

export type TipoSujetoComercial = "PERSONA" | "FUNDO" | "ASOCIATIVA" | "COOPERATIVA" | "RECORREDOR";
export type VisitaComercialDraft = {
  productorId?: string | null;
  crearProductor?: boolean;
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
  productor_id: string | null;
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
    productorId: row.productor_id,
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
    if (draft.crearProductor && (draft.nombres.trim().length > 100 || (draft.apellidos?.trim().length ?? 0) > 100)) {
      throw new Error("Los datos del productor deben tener como máximo 100 caracteres.");
    }
    if (!draft.crearProductor && !draft.productorId) {
      throw new Error("Selecciona un productor antes de guardar la visita.");
    }
    const localId = generateLocalId();
    const publicId = generatePublicId();
    const now = getNowIsoString();
    const entityType: Productor["entityType"] = draft.tipoSujeto === "ASOCIATIVA"
      ? "asociacion"
      : draft.tipoSujeto.toLowerCase() as Productor["entityType"];
    if (!draft.crearProductor && draft.productorId) {
      const selected = db.getFirstSync<{ entity_type: Productor["entityType"] }>(
        `SELECT entity_type FROM productores WHERE id = ? AND catalog_owner_user_id = ?
         AND (catalog_visible = 1 OR created_locally = 1)`,
        draft.productorId, owner
      );
      if (!selected || selected.entity_type !== entityType) {
        throw new Error("El productor no esta disponible o no coincide con el tipo de visita.");
      }
    }
    let productorId = draft.productorId ?? null;
    db.withTransactionSync(() => {
      if (draft.crearProductor) {
        productorId = generateLocalId();
        productoresRepository.insert({
          id: productorId,
          publicId: generatePublicId(),
          entityType,
          firstName: draft.nombres.trim(),
          lastName: person ? draft.apellidos!.trim() : null,
          documentTypeId: null,
          documentNumber: null,
          phone: null,
          email: null,
          address: null,
          isActive: false,
          createdAt: now,
          updatedAt: now,
          serverId: null,
          syncStatus: "pending",
          syncErrorMessage: null
        });
        insertSyncOutboxEntry(db, {
          entityType: "productores",
          entityLocalId: productorId,
          operation: "create",
          createdAt: now
        });
      }
      db.runSync(
        `INSERT INTO visitas_comerciales
          (local_id, public_id, owner_user_id, tipo_sujeto, productor_id, nombres, apellidos,
           descripcion, fecha_visita, ubicacion_visita, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        publicId,
        owner,
        draft.tipoSujeto,
        productorId,
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
