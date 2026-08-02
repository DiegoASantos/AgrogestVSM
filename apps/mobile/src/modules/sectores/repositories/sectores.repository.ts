import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean, getNowIsoString } from "../../../shared/database/sqlite-utils";
import type { SQLiteBindValue } from "expo-sqlite";
import type { Sector } from "../types";

type SectorRow = {
  id: string;
  public_id: string;
  distrito_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  server_id: string | null;
  sync_status: Sector["syncStatus"];
  sync_error_message: string | null;
};

const SECTOR_COLUMNS = `
  id,
  public_id,
  distrito_id,
  name,
  description,
  is_active,
  created_at,
  updated_at,
  server_id,
  sync_status,
  sync_error_message
`;

export const sectoresRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<SectorRow>(
      `SELECT ${SECTOR_COLUMNS}
       FROM sectores
       ORDER BY name ASC, id ASC`
    );

    return rows.map(mapSectorRow);
  },

  getById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<SectorRow>(
      `SELECT ${SECTOR_COLUMNS}
       FROM sectores
       WHERE id = ?
       LIMIT 1`,
      id
    );

    return row ? mapSectorRow(row) : null;
  },

  getByProductorId(productorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<SectorRow>(
      `SELECT ${SECTOR_COLUMNS}
       FROM sectores
       WHERE id IN (
         SELECT DISTINCT subsectores.sector_id
         FROM parcelas
         INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
         WHERE parcelas.productor_id = ?
       )
       ORDER BY name ASC, id ASC`,
      productorId
    );

    return rows.map(mapSectorRow);
  },

  getByDistritoId(distritoId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<SectorRow>(
      `SELECT ${SECTOR_COLUMNS}
       FROM sectores
       WHERE distrito_id = ?
       ORDER BY name ASC, id ASC`,
      distritoId
    );

    return rows.map(mapSectorRow);
  },

  insert(sector: Sector) {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO sectores (
        id, public_id, distrito_id, name, description,
        is_active, created_at, updated_at,
        server_id, sync_status, sync_error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sector.id,
      sector.publicId,
      sector.distritoId,
      sector.name,
      sector.description,
      1,
      sector.createdAt,
      sector.updatedAt,
      sector.serverId,
      sector.syncStatus,
      sector.syncErrorMessage
    );
  },

  update(id: string, data: { serverId?: string | null; syncStatus?: Sector["syncStatus"]; syncErrorMessage?: string | null }) {
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

    db.runSync(`UPDATE sectores SET ${sets.join(", ")} WHERE id = ?`, ...params);
  }
};

function mapSectorRow(row: SectorRow): Sector {
  return {
    id: row.id,
    publicId: row.public_id,
    distritoId: row.distrito_id,
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
