import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean } from "../../../shared/database/sqlite-utils";
import type { Sector } from "../types";

type SectorRow = {
  id: string;
  distrito_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const SECTOR_COLUMNS = `
  id,
  distrito_id,
  name,
  description,
  is_active,
  created_at,
  updated_at
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
         SELECT DISTINCT sector_id
         FROM parcelas
         WHERE productor_id = ?
       )
       ORDER BY name ASC, id ASC`,
      productorId
    );

    return rows.map(mapSectorRow);
  }
};

function mapSectorRow(row: SectorRow): Sector {
  return {
    id: row.id,
    distritoId: row.distrito_id,
    name: row.name,
    description: row.description,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
