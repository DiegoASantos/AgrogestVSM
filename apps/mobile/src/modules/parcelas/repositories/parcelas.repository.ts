import { getDatabase } from "../../../shared/database/connection";
import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import {
  fromSqliteBoolean,
  getNowIsoString,
  parseNullableJson,
  stringifyNullableJson,
  toSqliteBoolean
} from "../../../shared/database/sqlite-utils";
import type { SQLiteBindValue } from "expo-sqlite";
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
  parcel_reference_point: string | null;
  geometry: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  server_id: string | null;
  sync_status: Parcela["syncStatus"];
  sync_error_message: string | null;
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
  parcelas.parcel_reference_point AS parcel_reference_point,
  parcelas.geometry AS geometry,
  parcelas.is_active AS is_active,
  parcelas.created_at AS created_at,
  parcelas.updated_at AS updated_at,
  parcelas.server_id AS server_id,
  parcelas.sync_status AS sync_status,
  parcelas.sync_error_message AS sync_error_message
`;

export const parcelasRepository = {
  getAll() {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY parcelas.is_active DESC, parcelas.name ASC, parcelas.id ASC`,
      ownerUserId
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

  getDepartmentCodeById(id: string) {
    const db = getDatabase();
    const row = db.getFirstSync<{ code: string }>(
      `SELECT departamentos.code AS code
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       INNER JOIN sectores ON sectores.id = subsectores.sector_id
       INNER JOIN distritos ON distritos.id = sectores.distrito_id
       INNER JOIN provincias ON provincias.id = distritos.provincia_id
       INNER JOIN departamentos ON departamentos.id = provincias.departamento_id
       WHERE parcelas.id = ?
       LIMIT 1`,
      id
    );

    return row?.code ?? null;
  },

  getBySectorId(sectorId: string) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE subsectores.sector_id = ?
         AND parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY parcelas.is_active DESC, parcelas.name ASC, parcelas.id ASC`,
      sectorId,
      ownerUserId
    );

    return rows.map(mapParcelaRow);
  },

  getBySubsectorId(subsectorId: string) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.subsector_id = ?
         AND parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY parcelas.is_active DESC, parcelas.name ASC, parcelas.id ASC`,
      subsectorId,
      ownerUserId
    );

    return rows.map(mapParcelaRow);
  },

  getByProductorAndSubsector(productorId: string, subsectorId: string) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.productor_id = ?
         AND parcelas.subsector_id = ?
         AND parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY parcelas.is_active DESC, parcelas.name ASC, parcelas.id ASC`,
      productorId,
      subsectorId,
      ownerUserId
    );

    return rows.map(mapParcelaRow);
  },

  getByProductorId(productorId: string) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const rows = db.getAllSync<ParcelaRow>(
      `SELECT ${PARCELA_COLUMNS}
       FROM parcelas
       INNER JOIN subsectores ON subsectores.id = parcelas.subsector_id
       WHERE parcelas.productor_id = ?
         AND parcelas.catalog_owner_user_id = ?
         AND parcelas.catalog_visible = 1
       ORDER BY parcelas.is_active DESC, parcelas.name ASC, parcelas.id ASC`,
      productorId,
      ownerUserId
    );

    return rows.map(mapParcelaRow);
  },

  countByProductorId(productorId: string) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    const row = db.getFirstSync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM parcelas
       WHERE productor_id = ?
         AND catalog_owner_user_id = ?
         AND catalog_visible = 1`,
      productorId,
      ownerUserId
    );

    return row?.total ?? 0;
  },

  insert(parcela: Parcela) {
    const db = getDatabase();
    const ownerUserId = requireCatalogOwner(db);
    db.runSync(
      `INSERT INTO parcelas (
        id, public_id, productor_id, subsector_id, code, name,
        area_hectares, description, reference_point, parcel_reference_point, geometry,
        is_active, created_at, updated_at,
        server_id, sync_status, sync_error_message,
        catalog_owner_user_id, catalog_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      parcela.id,
      parcela.publicId,
      parcela.productorId,
      parcela.subsectorId,
      parcela.code,
      parcela.name,
      parcela.areaHectares,
      parcela.description,
      stringifyNullableJson(parcela.referencePoint),
      stringifyNullableJson(parcela.parcelReferencePoint),
      stringifyNullableJson(parcela.geometry),
      toSqliteBoolean(parcela.isActive),
      parcela.createdAt,
      parcela.updatedAt,
      parcela.serverId,
      parcela.syncStatus,
      parcela.syncErrorMessage,
      ownerUserId,
      1
    );
  },

  update(
    id: string,
    data: {
      serverId?: string | null;
      syncStatus?: Parcela["syncStatus"];
      syncErrorMessage?: string | null;
      code?: string;
      publicId?: string;
      isActive?: boolean;
    }
  ) {
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
    if (data.code !== undefined) {
      sets.push("code = ?");
      params.push(data.code);
    }
    if (data.publicId !== undefined) {
      sets.push("public_id = ?");
      params.push(data.publicId);
    }
    if (data.isActive !== undefined) {
      sets.push("is_active = ?");
      params.push(toSqliteBoolean(data.isActive));
    }

    sets.push("updated_at = ?");
    params.push(getNowIsoString());
    params.push(id);

    db.runSync(`UPDATE parcelas SET ${sets.join(", ")} WHERE id = ?`, ...params);
  }
};

function requireCatalogOwner(db: ReturnType<typeof getDatabase>): string {
  return getCatalogSessionUserId(db) ?? "__no_authenticated_catalog_owner__";
}

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
    parcelReferencePoint: normalizeGeoJsonPoint(
      parseNullableJson(row.parcel_reference_point)
    ),
    geometry: normalizeGeoJsonMultiPolygon(parseNullableJson(row.geometry)),
    isActive: fromSqliteBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message
  };
}
