import { parcelasRemote } from "../../modules/parcelas/services/parcelas.remote";
import { geografiasRemote } from "../../modules/geografias/services/geografias.remote";
import { productosRecomendadosRemote } from "../../modules/productos-recomendados/services/productos-recomendados.remote";
import { productoresRemote } from "../../modules/productores/services/productores.remote";
import { recomendacionesRemote } from "../../modules/recomendaciones/services/recomendaciones.remote";
import { sectoresRemote } from "../../modules/sectores/services/sectores.remote";
import { observacionesSanitariasRemote } from "../../modules/observaciones-sanitarias/services/observaciones-sanitarias.remote";
import { visitaCampoCatalogsRemote } from "../../modules/visitas-campo/services/visita-campo-catalogs.remote";
import { getCatalogsDownloadedAt } from "./catalog-status";
import { initDatabase } from "./connection";
import {
  getNowIsoString,
  stringifyNullableJson,
  toSqliteBoolean
} from "./sqlite-utils";

export async function downloadAllCatalogs() {
  const cultivos = await visitaCampoCatalogsRemote.getCultivos();
  const [
    variedadesByCultivo,
    campaniasByCultivo,
    etapasByCultivo,
    subEtapas,
    pestDiseases,
    incidenceLevels,
    recommendationTypes,
    products,
    applicationFrequencies,
    productores,
    distritos,
    sectores,
    parcelas
  ] = await Promise.all([
    Promise.all(
      cultivos.map((cultivo) =>
        visitaCampoCatalogsRemote.getVariedadesByCultivo(cultivo.id)
      )
    ),
    Promise.all(
      cultivos.map((cultivo) =>
        visitaCampoCatalogsRemote.getCampaniasByCultivo(cultivo.id)
      )
    ),
    Promise.all(
      cultivos.map((cultivo) =>
        visitaCampoCatalogsRemote.getEtapasFenologicasByCultivo(cultivo.id)
      )
    ),
    visitaCampoCatalogsRemote.getSubEtapas(),
    observacionesSanitariasRemote.getPestDiseases(),
    observacionesSanitariasRemote.getIncidenceLevels(),
    recomendacionesRemote.getRecommendationTypes(),
    productosRecomendadosRemote.getProducts(),
    productosRecomendadosRemote.getApplicationFrequencies(),
    productoresRemote.getAll(),
    geografiasRemote.getDistritos(),
    sectoresRemote.getAll(),
    parcelasRemote.getAll()
  ]);

  const variedades = variedadesByCultivo.flat();
  const campanias = campaniasByCultivo.flat();
  const etapasFenologicas = etapasByCultivo.flat();
  const downloadedAt = getNowIsoString();

  const db = initDatabase();

  db.execSync("PRAGMA foreign_keys = OFF");

  db.withTransactionSync(() => {
    for (const cultivo of cultivos) {
      db.runSync(
        `INSERT OR REPLACE INTO cultivos (id, code, name, is_active)
         VALUES (?, ?, ?, ?)`,
        cultivo.id,
        cultivo.code,
        cultivo.name,
        toSqliteBoolean(cultivo.isActive)
      );
    }

    for (const variedad of variedades) {
      db.runSync(
        `INSERT OR REPLACE INTO variedades (id, cultivo_id, code, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        variedad.id,
        variedad.cultivoId,
        variedad.code,
        variedad.name,
        toSqliteBoolean(variedad.isActive)
      );
    }

    for (const campania of campanias) {
      db.runSync(
        `INSERT OR REPLACE INTO campanias (
          id,
          cultivo_id,
          name,
          start_date,
          end_date,
          description,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        campania.id,
        campania.cultivoId,
        campania.name,
        campania.startDate,
        campania.endDate,
        campania.description,
        toSqliteBoolean(campania.isActive)
      );
    }

    for (const etapa of etapasFenologicas) {
      db.runSync(
        `INSERT OR REPLACE INTO etapas_fenologicas (
          id,
          cultivo_id,
          name,
          description,
          sort_order,
          type,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        etapa.id,
        etapa.cultivoId,
        etapa.name,
        etapa.description,
        etapa.sortOrder,
        etapa.type,
        toSqliteBoolean(etapa.isActive)
      );
    }

    for (const subEtapa of subEtapas) {
      db.runSync(
        `INSERT OR REPLACE INTO sub_etapas (
          id,
          etapa_fenologica_id,
          name,
          sort_order,
          description,
          percentage,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        subEtapa.id,
        subEtapa.etapaFenologicaId,
        subEtapa.name,
        subEtapa.sortOrder,
        subEtapa.description,
        subEtapa.percentage === null ? null : String(subEtapa.percentage),
        toSqliteBoolean(subEtapa.isActive)
      );
    }

    for (const pestDisease of pestDiseases) {
      db.runSync(
        `INSERT OR REPLACE INTO pest_diseases (id, code, name, type, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        pestDisease.id,
        pestDisease.code,
        pestDisease.name,
        pestDisease.type,
        toSqliteBoolean(pestDisease.isActive)
      );
    }

    for (const incidenceLevel of incidenceLevels) {
      db.runSync(
        `INSERT OR REPLACE INTO incidence_levels (id, name, sort_order)
         VALUES (?, ?, ?)`,
        incidenceLevel.id,
        incidenceLevel.name,
        incidenceLevel.sortOrder
      );
    }

    for (const recommendationType of recommendationTypes) {
      db.runSync(
        `INSERT OR REPLACE INTO recommendation_types (id, name, is_active)
         VALUES (?, ?, ?)`,
        recommendationType.id,
        recommendationType.name,
        toSqliteBoolean(recommendationType.isActive)
      );
    }

    for (const product of products) {
      db.runSync(
        `INSERT OR REPLACE INTO products (id, name, is_active)
         VALUES (?, ?, ?)`,
        product.id,
        product.name,
        toSqliteBoolean(product.isActive)
      );
    }

    for (const applicationFrequency of applicationFrequencies) {
      db.runSync(
        `INSERT OR REPLACE INTO application_frequencies (
          id,
          name,
          interval_days,
          is_active
        ) VALUES (?, ?, ?, ?)`,
        applicationFrequency.id,
        applicationFrequency.name,
        applicationFrequency.intervalDays,
        toSqliteBoolean(applicationFrequency.isActive)
      );
    }

    for (const productor of productores) {
      db.runSync(
        `INSERT OR REPLACE INTO productores (
          id,
          public_id,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        productor.id,
        productor.publicId,
        productor.documentTypeId,
        productor.documentNumber,
        productor.firstName,
        productor.lastName,
        productor.phone,
        productor.email,
        productor.address,
        toSqliteBoolean(productor.isActive),
        productor.createdAt,
        productor.updatedAt
      );
    }

    for (const distrito of distritos) {
      const { departamento } = distrito.provincia;

      db.runSync(
        `INSERT OR REPLACE INTO departamentos (id, code, name)
         VALUES (?, ?, ?)`,
        departamento.id,
        departamento.code,
        departamento.name
      );
      db.runSync(
        `INSERT OR REPLACE INTO provincias (id, departamento_id, code, name)
         VALUES (?, ?, ?, ?)`,
        distrito.provincia.id,
        distrito.provincia.departamentoId,
        distrito.provincia.code,
        distrito.provincia.name
      );
      db.runSync(
        `INSERT OR REPLACE INTO distritos (id, provincia_id, ubigeo, name)
         VALUES (?, ?, ?, ?)`,
        distrito.id,
        distrito.provinciaId,
        distrito.ubigeo,
        distrito.name
      );
    }

    for (const sector of sectores) {
      db.runSync(
        `INSERT OR REPLACE INTO sectores (
          id,
          distrito_id,
          name,
          description,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        sector.id,
        sector.distritoId,
        sector.name,
        sector.description,
        toSqliteBoolean(sector.isActive),
        sector.createdAt,
        sector.updatedAt
      );
    }

    for (const parcela of parcelas) {
      db.runSync(
        `INSERT OR REPLACE INTO parcelas (
          id,
          public_id,
          productor_id,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        parcela.id,
        parcela.publicId,
        parcela.productorId,
        parcela.sectorId,
        parcela.code,
        parcela.name,
        parcela.areaHectares,
        parcela.description,
        stringifyNullableJson(parcela.referencePoint),
        stringifyNullableJson(parcela.geometry),
        toSqliteBoolean(parcela.isActive),
        parcela.createdAt,
        parcela.updatedAt
      );
    }

    db.runSync(
      `INSERT OR REPLACE INTO app_meta (key, value)
       VALUES (?, ?)`,
      "catalogs_downloaded_at",
      downloadedAt
    );
  });

  db.execSync("PRAGMA foreign_keys = ON");
}

export async function refreshCatalogsIfStale(): Promise<boolean> {
  const lastDownload = getCatalogsDownloadedAt();
  const hoursOld = lastDownload
    ? (Date.now() - new Date(lastDownload).getTime()) / (1000 * 60 * 60)
    : Infinity;

  if (hoursOld <= 24) {
    return false;
  }

  await downloadAllCatalogs();
  return true;
}
