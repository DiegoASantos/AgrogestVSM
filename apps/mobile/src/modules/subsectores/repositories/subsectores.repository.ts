import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean } from "../../../shared/database/sqlite-utils";
import type { Subsector } from "../types";

type SubsectorRow = {
  id: string;
  sector_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const SUBSECTOR_COLUMNS = `
  subsectores.id AS id,
  subsectores.sector_id AS sector_id,
  subsectores.name AS name,
  subsectores.description AS description,
  subsectores.is_active AS is_active,
  subsectores.created_at AS created_at,
  subsectores.updated_at AS updated_at
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
    const rows = db.getAllSync<SubsectorRow>(
      `SELECT DISTINCT ${SUBSECTOR_COLUMNS}
       FROM subsectores
       INNER JOIN parcelas ON parcelas.subsector_id = subsectores.id
       WHERE parcelas.productor_id = ?
         AND subsectores.sector_id = ?
       ORDER BY subsectores.name ASC, subsectores.id ASC`,
      productorId,
      sectorId
    );

    return rows.map(mapSubsectorRow);
  }
};

function mapSubsectorRow(row: SubsectorRow): Subsector {
  return {
    id: row.id,
    sectorId: row.sector_id,
    name: row.name,
    description: row.description,
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
