import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean } from "../../../shared/database/sqlite-utils";
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
  updated_at
`;

export const productoresRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ProductorRow>(
      `SELECT ${PRODUCTOR_COLUMNS}
       FROM productores
       ORDER BY COALESCE(first_name, document_number, public_id) ASC, id ASC`
    );

    return rows.map(mapProductorRow);
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
       WHERE id IN (
         SELECT DISTINCT productor_id
         FROM parcelas
         WHERE sector_id = ?
       )
       ORDER BY COALESCE(first_name, document_number, public_id) ASC, id ASC`,
      sectorId
    );

    return rows.map(mapProductorRow);
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
    updatedAt: row.updated_at
  };
}
