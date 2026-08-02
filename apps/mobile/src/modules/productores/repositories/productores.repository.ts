import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean, getNowIsoString } from "../../../shared/database/sqlite-utils";
import type { SQLiteBindValue } from "expo-sqlite";
import type { Productor } from "../types";

type ProductorRow = {
  id: string;
  public_id: string;
  entity_type: Productor["entityType"];
  document_type_id: number | null;
  document_number: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  server_id: string | null;
  sync_status: Productor["syncStatus"];
  sync_error_message: string | null;
};

const PRODUCTOR_COLUMNS = `
  id,
  public_id,
  entity_type,
  document_type_id,
  document_number,
  first_name,
  last_name,
  phone,
  email,
  address,
  is_active,
  created_at,
  updated_at,
  server_id,
  sync_status,
  sync_error_message
`;

export const productoresRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ProductorRow>(
      `SELECT ${PRODUCTOR_COLUMNS}
       FROM productores
       WHERE is_active = 1
       ORDER BY COALESCE(first_name, document_number, public_id) ASC, id ASC`
    );

    return rows.map(mapProductorRow);
  },

  searchByName(query: string, limit: number, offset: number) {
    const db = getDatabase();
    const searchPattern = `%${query.trim().toLowerCase()}%`;
    const rows = db.getAllSync<ProductorRow>(
      `SELECT ${PRODUCTOR_COLUMNS}
       FROM productores
       WHERE is_active = 1
         AND (
          LOWER(COALESCE(first_name, '')) LIKE ?
          OR LOWER(COALESCE(last_name, '')) LIKE ?
          OR LOWER(COALESCE(document_number, '')) LIKE ?
        )
       ORDER BY COALESCE(first_name, document_number, public_id) ASC, id ASC
       LIMIT ?
       OFFSET ?`,
      searchPattern,
      searchPattern,
      searchPattern,
      limit,
      offset
    );

    return rows.map(mapProductorRow);
  },

  countByName(query: string) {
    const db = getDatabase();
    const searchPattern = `%${query.trim().toLowerCase()}%`;
    const row = db.getFirstSync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM productores
       WHERE is_active = 1
         AND (
          LOWER(COALESCE(first_name, '')) LIKE ?
          OR LOWER(COALESCE(last_name, '')) LIKE ?
          OR LOWER(COALESCE(document_number, '')) LIKE ?
        )`,
      searchPattern,
      searchPattern,
      searchPattern
    );

    return row?.total ?? 0;
  },

  getById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<ProductorRow>(
      `SELECT ${PRODUCTOR_COLUMNS}
       FROM productores
       WHERE id = ?
       LIMIT 1`,
      id
    );

    return row ? mapProductorRow(row) : null;
  },

  getBySectorId(sectorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ProductorRow>(
      `SELECT ${PRODUCTOR_COLUMNS}
       FROM productores
       WHERE is_active = 1
         AND id IN (
          SELECT DISTINCT parcelas.productor_id
          FROM parcelas
          INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
          WHERE subsectores.sector_id = ?
        )
       ORDER BY COALESCE(first_name, document_number, public_id) ASC, id ASC`,
      sectorId
    );

    return rows.map(mapProductorRow);
  },

  insert(productor: Productor) {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO productores (
        id, public_id, entity_type, document_type_id, document_number,
        first_name, last_name, phone, email, address,
        is_active, created_at, updated_at,
        server_id, sync_status, sync_error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      productor.id,
      productor.publicId,
      productor.entityType,
      productor.documentTypeId,
      productor.documentNumber,
      productor.firstName,
      productor.lastName,
      productor.phone,
      productor.email,
      productor.address,
      1,
      productor.createdAt,
      productor.updatedAt,
      productor.serverId,
      productor.syncStatus,
      productor.syncErrorMessage
    );
  },

  update(id: string, data: { serverId?: string | null; syncStatus?: Productor["syncStatus"]; syncErrorMessage?: string | null }) {
    const db = getDatabase();
    const sets: string[] = [];
    const params: SQLiteBindValue[] = [];

    if (data.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(data.serverId);
    }
    if (data.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(data.syncStatus);
    }
    if (data.syncErrorMessage !== undefined) {
      sets.push("sync_error_message = ?");
      params.push(data.syncErrorMessage);
    }

    sets.push("updated_at = ?");
    params.push(getNowIsoString());
    params.push(id);

    db.runSync(`UPDATE productores SET ${sets.join(", ")} WHERE id = ?`, ...params);
  }
};

function mapProductorRow(row: ProductorRow): Productor {
  return {
    id: row.id,
    publicId: row.public_id,
    entityType: row.entity_type,
    documentTypeId: row.document_type_id,
    documentNumber: row.document_number,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message
  };
}
