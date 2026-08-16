import { getDatabase } from "../../../shared/database/connection";
import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { fromSqliteBoolean, getNowIsoString } from "../../../shared/database/sqlite-utils";
import type { SQLiteBindValue } from "expo-sqlite";
import type { Subsector } from "../types";

type SubsectorRow = {
  id: string;
  public_id: string;
  sector_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  server_id: string | null;
  sync_status: Subsector["syncStatus"];
  sync_error_message: string | null;
};

const SUBSECTOR_COLUMNS = `
  subsectores.id AS id,
  subsectores.public_id AS public_id,
  subsectores.sector_id AS sector_id,
  subsectores.name AS name,
  subsectores.description AS description,
  subsectores.is_active AS is_active,
  subsectores.created_at AS created_at,
  subsectores.updated_at AS updated_at,
  subsectores.server_id AS server_id,
  subsectores.sync_status AS sync_status,
  subsectores.sync_error_message AS sync_error_message
`;

export const subsectoresRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<SubsectorRow>(
      `SELECT ${SUBSECTOR_COLUMNS}
       FROM subsectores
       ORDER BY name ASC, id ASC`
    );

    return rows.map(mapSubsectorRow);
  },

  getBySectorId(sectorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<SubsectorRow>(
      `SELECT ${SUBSECTOR_COLUMNS}
       FROM subsectores
       WHERE sector_id = ?
       ORDER BY name ASC, id ASC`,
      sectorId
    );

    return rows.map(mapSubsectorRow);
  },

  getByProductorAndSector(productorId: string, sectorId: string) {
    const db = getDatabase();
    const ownerUserId =
      getCatalogSessionUserId(db) ?? "__no_authenticated_catalog_owner__";
    const rows = db.getAllSync<SubsectorRow>(
      `SELECT DISTINCT ${SUBSECTOR_COLUMNS}
       FROM subsectores
       INNER JOIN parcelas ON parcelas.subsector_id = subsectores.id
       WHERE parcelas.productor_id = ?
         AND subsectores.sector_id = ?
         AND parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY subsectores.name ASC, subsectores.id ASC`,
      productorId,
      sectorId,
      ownerUserId
    );

    return rows.map(mapSubsectorRow);
  },

  getById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<SubsectorRow>(
      `SELECT ${SUBSECTOR_COLUMNS}
       FROM subsectores
       WHERE id = ?
       LIMIT 1`,
      id
    );

    return row ? mapSubsectorRow(row) : null;
  },

  insert(subsector: Subsector) {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO subsectores (
        id, public_id, sector_id, name, description,
        is_active, created_at, updated_at,
        server_id, sync_status, sync_error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      subsector.id,
      subsector.publicId,
      subsector.sectorId,
      subsector.name,
      subsector.description,
      1,
      subsector.createdAt,
      subsector.updatedAt,
      subsector.serverId,
      subsector.syncStatus,
      subsector.syncErrorMessage
    );
  },

  update(id: string, data: { serverId?: string | null; syncStatus?: Subsector["syncStatus"]; syncErrorMessage?: string | null }) {
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

    db.runSync(`UPDATE subsectores SET ${sets.join(", ")} WHERE id = ?`, ...params);
  }
};

function mapSubsectorRow(row: SubsectorRow): Subsector {
  return {
    id: row.id,
    publicId: row.public_id,
    sectorId: row.sector_id,
    name: row.name,
    description: row.description,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message
  };
}
