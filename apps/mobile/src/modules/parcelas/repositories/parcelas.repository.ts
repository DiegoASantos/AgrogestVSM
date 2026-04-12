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
  id,
  public_id,
  sector_id,
  code,
  name,
  area_hectares,
  description,
  reference_point,
  geometry,
  is_active,
  created_at,
  updated_at
`;

export const parcelasRepository = {
  getAll() {
    const db = getDatabase();
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       ORDER BY name ASC, id ASC`
    );

    return rows.map(mapParcelaRow);
  },

  getById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       WHERE id = ?
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
       WHERE sector_id = ?
       ORDER BY name ASC, id ASC`,
      sectorId
    );

    return rows.map(mapParcelaRow);
  }
};

function mapParcelaRow(row: ParcelaRow): Parcela {
  return {
    id: row.id,
    publicId: row.public_id,
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
