import { getDatabase } from "../../../shared/database/connection";
import {
  fromSqliteBoolean,
  parseNullableJson
} from "../../../shared/database/sqlite-utils";
import {
  normalizeGeoJsonMultiPolygon,
  normalizeGeoJsonPoint
} from "../../../shared/maps/geo";
import type { Parcela } from "../types";

type ParcelaRow = {
  id: string;
  public_id: string;
  productor_id: string;
  subsector_id: string;
  sector_id: string;
  code: string;
  name: string;
  area_hectares: string | null;
  description: string | null;
  reference_point: string | null;
  geometry: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const PARCELA_COLUMNS = `
  parcelas.id AS id,
  parcelas.public_id AS public_id,
  parcelas.productor_id AS productor_id,
  parcelas.subsector_id AS subsector_id,
  subsectores.sector_id AS sector_id,
  parcelas.code AS code,
  parcelas.name AS name,
  parcelas.area_hectares AS area_hectares,
  parcelas.description AS description,
  parcelas.reference_point AS reference_point,
  parcelas.geometry AS geometry,
  parcelas.is_active AS is_active,
  parcelas.created_at AS created_at,
  parcelas.updated_at AS updated_at
`;

export const parcelasRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       ORDER BY parcelas.name ASC, parcelas.id ASC`
    );

    return rows.map(mapParcelaRow);
  },

  getById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.id = ?
       LIMIT 1`,
      id
    );

    return row ? mapParcelaRow(row) : null;
  },

  getBySectorId(sectorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE subsectores.sector_id = ?
       ORDER BY parcelas.name ASC, parcelas.id ASC`,
      sectorId
    );

    return rows.map(mapParcelaRow);
  },

  getBySubsectorId(subsectorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.subsector_id = ?
       ORDER BY parcelas.name ASC, parcelas.id ASC`,
      subsectorId
    );

    return rows.map(mapParcelaRow);
  },

  getByProductorAndSubsector(productorId: string, subsectorId: string) {
    const db = getDatabase();
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.productor_id = ?
         AND parcelas.subsector_id = ?
       ORDER BY parcelas.name ASC, parcelas.id ASC`,
      productorId,
      subsectorId
    );

    return rows.map(mapParcelaRow);
  }
};

function mapParcelaRow(row: ParcelaRow): Parcela {
  return {
    id: row.id,
    publicId: row.public_id,
    productorId: row.productor_id,
    subsectorId: row.subsector_id,
    sectorId: row.sector_id,
    code: row.code,
    name: row.name,
    areaHectares: row.area_hectares,
    description: row.description,
    referencePoint: normalizeGeoJsonPoint(parseNullableJson(row.reference_point)),
    geometry: normalizeGeoJsonMultiPolygon(parseNullableJson(row.geometry)),
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
