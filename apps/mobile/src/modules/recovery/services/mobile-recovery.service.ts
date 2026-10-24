import { apiRequest } from "../../../shared/services/api/client";
import { ApiError } from "../../../shared/services/api/errors";
import { getDatabase } from "../../../shared/database/connection";
import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { forceRefreshAllCatalogs } from "../../../shared/database/seed-catalogs";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";

type RecoveryPage = {
  window: { from: string; to: string; timeZone: string };
  counts: Record<string, number>;
  snapshot: string;
  // Heterogeneous server aggregates are checked by SQLite constraints before their cursor is committed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<{ type: string; id: string; data: Record<string, any> }>;
  nextCursor: string | null;
};

export type MobileRecoveryProgress = {
  recovered: number;
  counts: Record<string, number>;
  completed: boolean;
};

const META_PREFIX = "mobile_recovery_v1:";

export const mobileRecoveryService = {
  isPrompted(userId: string) {
    return getDatabase().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ?", `${META_PREFIX}prompted:${userId}`
    )?.value === "1";
  },

  markPrompted(userId: string) {
    getDatabase().runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, '1')", `${META_PREFIX}prompted:${userId}`);
  },

  async recoverPage(userId: string): Promise<MobileRecoveryProgress> {
    const db = getDatabase();
    if (getCatalogSessionUserId(db) !== userId) throw new Error("La sesión local cambió. Vuelve a iniciar la recuperación.");
    const progressKey = `${META_PREFIX}cursor:${userId}`;
    const savedCursor = db.getFirstSync<{ value: string | null }>("SELECT value FROM app_meta WHERE key = ?", progressKey)?.value ?? null;
    const cursor = savedCursor === "__complete__" ? null : savedCursor;

    if (!cursor) await forceRefreshAllCatalogs();
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    let page: RecoveryPage;
    try {
      page = await apiRequest<RecoveryPage>(`/mobile/recuperacion${query}`, { timeoutMs: 60_000 });
    } catch (error) {
      if (!cursor || !(error instanceof ApiError) || error.statusCode !== 400) throw error;
      db.runSync("DELETE FROM app_meta WHERE key = ?", progressKey);
      await forceRefreshAllCatalogs();
      page = await apiRequest<RecoveryPage>("/mobile/recuperacion", { timeoutMs: 60_000 });
    }
    const owner = getCatalogSessionUserId(db);
    if (owner !== userId) throw new Error("La sesión local cambió durante la recuperación.");

    db.withTransactionSync(() => {
      for (const item of page.items) importAggregate(db, item, userId);
      db.runSync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
        progressKey,
        page.nextCursor ?? "__complete__"
      );
      db.runSync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
        `${META_PREFIX}counts:${userId}`,
        JSON.stringify(page.counts)
      );
    });
    return { recovered: page.items.length, counts: page.counts, completed: page.nextCursor === null };
  }
};

function importAggregate(db: ReturnType<typeof getDatabase>, item: RecoveryPage["items"][number], ownerId: string) {
  const now = getNowIsoString();
  switch (item.type) {
    case "visita_tecnica": return importTechnicalVisit(db, item, ownerId, now);
    case "visita_comercial": return importCommercialVisit(db, item, ownerId, now);
    case "pago_cosecha": return importPayment(db, item, ownerId, now);
    case "registro_cosecha": return importHarvest(db, item, ownerId, now);
    default: throw new Error("La API devolvió un tipo de actividad no compatible.");
  }
}

function importTechnicalVisit(db: ReturnType<typeof getDatabase>, item: RecoveryPage["items"][number], ownerId: string, now: string) {
  const value = item.data;
  const visit = value.visita;
  if (!visit) throw new Error("La visita recuperada no incluye su cabecera.");
  if (hasLocalConflict(db, "visitas_campo", "visitas_campo", item.id, ownerId)) return;
  const crop = resolveCatalog(db, "cultivos", visit.cropId);
  const variety = resolveCatalog(db, "variedades", visit.varietyId);
  const parcel = resolveCatalog(db, "parcelas", visit.parcelaId);
  const campaign = resolveCatalog(db, "campanias", visit.campaignId);
  const stageEntries = visit.phenologicalStages ?? [];
  const primary = stageEntries[0];
  const stageRemoteId = primary?.phenologicalStageId ?? visit.phenologicalStageId;
  const subStageRemoteId = primary?.subEtapaId ?? visit.subEtapaId;
  const stage = stageRemoteId ? resolveCatalog(db, "etapas_fenologicas", stageRemoteId) : null;
  const subStage = subStageRemoteId ? resolveCatalog(db, "sub_etapas", subStageRemoteId) : null;
  const localVisitId = generateLocalId();
  db.runSync(`INSERT INTO visitas_campo (
    local_id, server_id, public_id, nro_ficha, crop_id, variety_id, parcela_id, campaign_id, agronomist_user_id,
    plants_count, area_hectares, sowing_date, visit_date, start_visit_time, end_visit_time, phenological_stage_id,
    sub_etapa_id, sub_etapa_percentage, general_observation, agronomist_signature_name, producer_signature_name,
    visit_location, synchronized_at, is_active, version_score_tecnico, sync_status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
  localVisitId, item.id, visit.publicId, visit.nroFicha, crop, variety, parcel, campaign, visit.agronomistUserId,
  visit.plantsCount, visit.areaHectares, visit.sowingDate, visit.visitDate, visit.startVisitTime, visit.endVisitTime,
  stage, subStage, visit.subEtapaPercentage == null ? null : String(visit.subEtapaPercentage), visit.generalObservation,
  visit.agronomistSignatureName, visit.producerSignatureName, visit.visitLocation ? JSON.stringify(visit.visitLocation) : null,
  visit.synchronizedAt, visit.isActive ? 1 : 0, visit.technicalScoreVersion ?? 2, visit.createdAt ?? now, visit.updatedAt ?? now);

  for (const [index, entry] of stageEntries.entries()) {
    db.runSync(`INSERT INTO visita_etapas_fenologicas (local_id, visita_local_id, phenological_stage_id, sub_etapa_id,
      coverage_percentage, labor_progress_percentage, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    generateLocalId(), localVisitId, resolveCatalog(db, "etapas_fenologicas", entry.phenologicalStageId),
    entry.subEtapaId ? resolveCatalog(db, "sub_etapas", entry.subEtapaId) : null,
    entry.coveragePercentage, entry.laborProgressPercentage == null ? null : String(entry.laborProgressPercentage), index, now, now);
  }
  for (const evaluation of value.evaluaciones ?? []) {
    const nutrient = evaluation.nutrientId ? resolveCatalog(db, "nutrientes", evaluation.nutrientId) : null;
    db.runSync(`INSERT INTO visita_evaluaciones (local_id, server_id, visita_local_id, nutrient_id, sort_order, incidence_percentage,
      percentage, description, organos_afectados, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
    generateLocalId(), String(evaluation.id), localVisitId, nutrient, evaluation.order, evaluation.incidencePercentage,
    evaluation.percentage, evaluation.description, JSON.stringify(evaluation.organosAfectados ?? []), now, now);
  }
  for (const observation of value.observacionesSanitarias ?? []) {
    const disease = resolveCatalog(db, "pest_diseases", observation.pestDiseaseId);
    const incidence = observation.incidenceLevelId ? resolveCatalog(db, "incidence_levels", observation.incidenceLevelId) : null;
    const severity = observation.severityLevelId ? resolveCatalog(db, "incidence_levels", observation.severityLevelId) : null;
    const localObservationId = generateLocalId();
    db.runSync(`INSERT INTO visita_observaciones_sanitarias (local_id, server_id, visita_local_id, pest_disease_id, incidence_level_id,
      severity_level_id, incidence_percentage, observation, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
    localObservationId, String(observation.id), localVisitId, disease, incidence, severity, observation.incidencePercentage, observation.observation, now, now);
    for (const organ of observation.organosAfectados ?? []) db.runSync(
      `INSERT INTO visita_observacion_sanitaria_organos (local_id, visita_observacion_sanitaria_local_id, organo, created_at) VALUES (?, ?, ?, ?)`,
      generateLocalId(), localObservationId, organ, now
    );
  }
  if (value.riego) {
    const irrigation = value.riego;
    db.runSync(`INSERT INTO visita_riegos (local_id, server_id, visita_local_id, tipo_riego_id, fuente_agua, tipo_suelo, humedad_suelo,
      estres_hidrico, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
    generateLocalId(), String(irrigation.id), localVisitId, resolveCatalog(db, "tipos_riego", irrigation.tipoRiegoId),
    irrigation.fuenteAgua, irrigation.tipoSuelo, irrigation.humedadSuelo,
    irrigation.estresHidrico == null ? null : irrigation.estresHidrico ? 1 : 0, now, now);
  }
  for (const labor of value.laboresCulturales ?? []) db.runSync(
    `INSERT INTO visita_labores_culturales (local_id, server_id, visita_local_id, labor_cultural_id, sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'synced', ?, ?)`, generateLocalId(), String(labor.id), localVisitId,
    resolveCatalog(db, "labores_culturales", labor.laborCulturalId), now, now
  );
  for (const note of value.stepNotes ?? []) db.runSync(
    `INSERT INTO visita_paso_observaciones (local_id, server_id, visita_local_id, step_number, observation, recommendation,
      finalizado_at, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
    generateLocalId(), String(note.id), localVisitId, note.stepNumber, note.observation, note.recommendation, note.finalizedAt, now, now
  );
  for (const score of value.calificaciones ?? []) db.runSync(
    `INSERT INTO visita_calificaciones (local_id, server_id, visita_local_id, modulo, puntaje, observacion, justificado,
      categoria_justificacion, motivo_justificacion, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
    generateLocalId(), String(score.id), localVisitId, score.modulo, score.puntaje, score.observacion,
    score.justificado == null ? null : score.justificado ? 1 : 0, score.categoriaJustificacion ?? null,
    score.motivoJustificacion ?? null, score.createdAt ?? now, score.updatedAt ?? now
  );
  if (value.receta) importRecipe(db, value.receta, localVisitId, now);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function importRecipe(db: ReturnType<typeof getDatabase>, recipe: Record<string, any>, visitId: string, now: string) {
  const recipeId = generateLocalId();
  db.runSync(`INSERT INTO visita_recetas (local_id, server_id, visita_local_id, etapa_fenologica, version, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'synced', ?, ?)`, recipeId, String(recipe.id), visitId, recipe.etapaFenologica, recipe.version ?? 1, now, now);
  const mixes = new Map<number, string>();
  for (const mix of recipe.mezclas ?? []) {
    const mixId = generateLocalId(); mixes.set(mix.numero, mixId);
    db.runSync(`INSERT INTO visita_receta_mezcla (local_id, server_id, receta_local_id, numero, frecuencia_dosis, coadyuvantes_ids,
      coadyuvantes_dosis, orden_mezcla, volumen_aplicacion, factor, factor_editable, cantidad_total_producto, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`, mixId, String(mix.id), recipeId, mix.numero, mix.frecuenciaDosis ?? null,
    json(mix.coadyuvantesIds), json(mix.coadyuvantesDosis), json(mix.ordenMezcla), mix.volumenAplicacion ?? null, mix.factor ?? "1",
    mix.factorEditable ? 1 : 0, mix.cantidadTotalProducto ?? null, now, now);
    for (const product of mix.productos ?? []) insertPhytosanitary(db, recipeId, mixes, mix.numero, product, now);
  }
  for (const product of recipe.fitosanidad ?? []) insertPhytosanitary(db, recipeId, mixes, product.numero ?? 1, product, now);
  for (const item of recipe.fertilizacion ?? []) db.runSync(`INSERT INTO visita_receta_fertilizacion (local_id, server_id, receta_local_id,
    mezcla_local_id, producto_ref, origen, enfoque, nutriente_id, nutriente_nombre, via_aplicacion, fertilizante_nombre, tipo_producto,
    dosis, unidad_dosis, cantidad_total_plantas, volumen_aplicacion, cantidad_total_fertilizante, factor, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`, generateLocalId(), String(item.id), recipeId,
    mixes.get(item.mezclaNumero) ?? null, item.productoRef ?? `fertilizer:${item.id}`, item.origen ?? "recomendacion", item.enfoque ?? "reactivo",
    item.nutrienteId ?? null, item.nutrienteNombre ?? null, item.viaAplicacion ?? "edafica",
    item.fertilizanteNombre ?? null, item.tipoProducto ?? null, item.dosis ?? null, item.unidadDosis ?? null,
    item.cantidadTotalPlantas ?? null, item.volumenAplicacion ?? null, item.cantidadTotalFertilizante ?? null,
    item.factor ?? "1", now, now);
  for (const irrigation of (recipe.riego ? [recipe.riego] : [])) db.runSync(`INSERT INTO visita_receta_riego (local_id, server_id, receta_local_id,
    tipo_recomendacion, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, 'synced', ?, ?)`,
    generateLocalId(), String(irrigation.id), recipeId, irrigation.tipoRecomendacion, now, now);
  for (const labor of recipe.labores ?? []) db.runSync(`INSERT INTO visita_receta_labores (local_id, server_id, receta_local_id,
    labor, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, 'synced', ?, ?)`, generateLocalId(), String(labor.id), recipeId, labor.labor, now, now);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertPhytosanitary(db: ReturnType<typeof getDatabase>, recipeId: string, mixes: Map<number, string>, number: number, p: Record<string, any>, now: string) {
  db.runSync(`INSERT INTO visita_receta_fitosanidad (local_id, server_id, receta_local_id, mezcla_local_id, producto_ref, numero, origen,
    objetivo, objetivo_nombre, enfoque, objetivo_id, incidencia_grado, severidad_grado, tipo_control_id, tipo_producto_id, disolvente,
    modo_accion_id, ingrediente_activo_nombre, dosis_ia, dosis_producto, unidad_dosis, volumen_aplicacion, cantidad_total_ia,
    marca_producto_nombre, concentracion_producto, cantidad_total_producto, coadyuvantes_ids, orden_mezcla, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
  generateLocalId(), String(p.id), recipeId, mixes.get(number) ?? null, p.productoRef ?? `recovery:${p.id}`, number, p.origen ?? "recomendacion",
  p.objetivo ?? null, p.objetivoNombre ?? null, p.enfoque ?? null, p.objetivoId ?? null,
  p.incidenciaGrado ?? null, p.severidadGrado ?? null, p.tipoControlId ?? null, p.tipoProductoId ?? null,
  p.disolvente ?? "Agua", p.modoAccionId ?? null, p.ingredienteActivoNombre ?? null, p.dosisIa ?? null,
  p.dosisProducto ?? null, p.unidadDosis ?? null, p.volumenAplicacion ?? null, p.cantidadTotalIa ?? null,
  p.marcaProductoNombre ?? null, p.concentracionProducto ?? null, p.cantidadTotalProducto ?? null, json(p.coadyuvantesIds),
  json(p.ordenMezcla), now, now);
}

function importCommercialVisit(db: ReturnType<typeof getDatabase>, item: RecoveryPage["items"][number], ownerId: string, now: string) {
  const v = item.data;
  if (hasLocalConflict(db, "visitas_comerciales", "visitas_comerciales", item.id, ownerId)) return;
  const producer = v.productorId ? resolveCatalog(db, "productores", v.productorId) : null;
  db.runSync(`INSERT INTO visitas_comerciales (local_id, public_id, server_id, owner_user_id, tipo_sujeto, productor_id, nombres, apellidos,
    descripcion, fecha_visita, ubicacion_visita, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)`,
  generateLocalId(), v.publicId, item.id, ownerId, v.tipoSujeto, producer, v.nombres, v.apellidos, v.descripcion, v.fechaVisita,
  v.ubicacionVisita ? JSON.stringify(v.ubicacionVisita) : null, v.creadoAt ?? now, v.actualizadoAt ?? now);
}

function importPayment(db: ReturnType<typeof getDatabase>, item: RecoveryPage["items"][number], ownerId: string, now: string) {
  const p = item.data;
  if (hasLocalConflict(db, "pagos_cosecha", "pagos_cosecha", item.id, ownerId)) return;
  const producer = resolveCatalog(db, "productores", p.productorId);
  db.runSync(`INSERT INTO pagos_cosecha (local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor, tipo_documento_acreedor,
    nro_documento_acreedor, banco, nro_cuenta, server_id, sync_status, created_at, updated_at, owner_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`, generateLocalId(), p.publicId, producer, p.creditorFirstName,
  p.creditorLastName, p.creditorDocumentType, p.creditorDocumentNumber, p.bank, p.accountNumber, item.id, p.createdAt ?? now, p.updatedAt ?? now, ownerId);
}

function importHarvest(db: ReturnType<typeof getDatabase>, item: RecoveryPage["items"][number], ownerId: string, now: string) {
  const h = item.data;
  if (hasLocalConflict(db, "registros_cosecha", "registros_cosecha", item.id, ownerId)) return;
  const producer = resolveCatalog(db, "productores", h.productorId);
  const creditor = resolveOrImportCreditor(db, h, ownerId, now);
  db.runSync(`INSERT INTO registros_cosecha (local_id, public_id, productor_id, acreedor_local_id, cantidad_jabas, precio_jaba,
    fecha_registro, fecha_cosecha, nombres_acreedor, apellidos_acreedor, tipo_documento_acreedor, nro_documento_acreedor, banco,
    nro_cuenta, server_id, sync_status, created_at, updated_at, owner_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
  generateLocalId(), h.publicId, producer, creditor, h.crateQuantity, h.cratePrice, h.registrationDate, h.harvestDate, h.creditorFirstName,
  h.creditorLastName, h.creditorDocumentType, h.creditorDocumentNumber, h.bank, h.accountNumber, item.id, h.createdAt ?? now, h.updatedAt ?? now, ownerId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveOrImportCreditor(db: ReturnType<typeof getDatabase>, harvest: Record<string, any>, ownerId: string, now: string) {
  const remoteId = String(harvest.creditorId);
  const existing = db.getFirstSync<{ local_id: string }>(
    "SELECT local_id FROM acreedores_cosecha WHERE server_id = ? AND owner_user_id = ? LIMIT 1", remoteId, ownerId
  );
  if (existing) return existing.local_id;
  const creditor = harvest.creditor;
  if (!creditor) throw new Error("Falta el acreedor vinculado a un registro de cosecha. Actualiza los catálogos y reintenta.");
  const producer = resolveCatalog(db, "productores", creditor.productorId);
  const localId = generateLocalId();
  db.runSync(`INSERT INTO acreedores_cosecha (local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
    tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta, server_id, approval_status, source, review_observation,
    sync_status, created_at, updated_at, owner_user_id, catalog_visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?, 1)`,
  localId, creditor.publicId, producer, creditor.creditorFirstName, creditor.creditorLastName, creditor.creditorDocumentType,
  creditor.creditorDocumentNumber, creditor.bank, creditor.accountNumber, remoteId, creditor.approvalStatus ?? "APPROVED",
  creditor.source === "PRODUCTOR" ? "PRODUCTOR" : "MOBILE", creditor.reviewObservation ?? null,
  creditor.createdAt ?? now, creditor.updatedAt ?? now, ownerId);
  return localId;
}

function hasLocalConflict(db: ReturnType<typeof getDatabase>, table: string, type: string, serverId: string, ownerId: string) {
  const identity = table === "visitas_campo" ? "(server_id = ? OR public_id = ?) AND agronomist_user_id = ?" : "(server_id = ? OR public_id = ?) AND owner_user_id = ?";
  const existing = db.getFirstSync<{ local_id: string; sync_status: string }>(
    `SELECT local_id, sync_status FROM ${table} WHERE ${identity} LIMIT 1`,
    serverId, serverId, ownerId
  );
  if (!existing) return false;
  if (existing.sync_status === "pending" || existing.sync_status === "error") return true;
  const hasQueueEntry = (entityType: string, localId: string) => Boolean(
    db.getFirstSync<{ id: number }>("SELECT id FROM sync_outbox WHERE entity_type = ? AND entity_local_id = ? LIMIT 1", entityType, localId) ||
    db.getFirstSync<{ id: number }>("SELECT id FROM sync_failures WHERE entity_type = ? AND entity_local_id = ? LIMIT 1", entityType, localId)
  );
  if (hasQueueEntry(type, existing.local_id)) return true;
  if (table === "visitas_campo") {
    const draft = db.getFirstSync<{ scope_key: string }>(
      "SELECT scope_key FROM visit_form_drafts WHERE owner_user_id = ? AND scope_key = ? LIMIT 1", ownerId, existing.local_id
    );
    if (draft) return true;
    const childTables = [
      ["visita_evaluaciones", "visita_evaluaciones"],
      ["visita_observaciones_sanitarias", "visita_observaciones_sanitarias"], ["visita_paso_observaciones", "visita_paso_observaciones"],
      ["visita_riegos", "visita_riegos"], ["visita_labores_culturales", "visita_labores_culturales"],
      ["visita_calificaciones", "visita_calificaciones"]
    ] as const;
    for (const [childTable, childType] of childTables) {
      const children = db.getAllSync<{ local_id: string; sync_status: string }>(
        `SELECT local_id, sync_status FROM ${childTable} WHERE visita_local_id = ?`, existing.local_id
      );
      if (children.some((child) => child.sync_status === "pending" || child.sync_status === "error" || hasQueueEntry(childType, child.local_id))) return true;
    }
    const recipe = db.getFirstSync<{ local_id: string; sync_status: string }>(
      "SELECT local_id, sync_status FROM visita_recetas WHERE visita_local_id = ? LIMIT 1", existing.local_id
    );
    if (recipe && ((recipe.sync_status === "pending" || recipe.sync_status === "error") || hasQueueEntry("visita_recetas", recipe.local_id))) return true;
    if (recipe) {
      for (const [childTable, childType] of [
        ["visita_receta_mezcla", "visita_receta_mezcla"], ["visita_receta_fitosanidad", "visita_receta_fitosanidad"],
        ["visita_receta_fertilizacion", "visita_receta_fertilizacion"], ["visita_receta_riego", "visita_receta_riego"],
        ["visita_receta_labores", "visita_receta_labores"]
      ] as const) {
        const children = db.getAllSync<{ local_id: string; sync_status: string }>(
          `SELECT local_id, sync_status FROM ${childTable} WHERE receta_local_id = ?`, recipe.local_id
        );
        if (children.some((child) => child.sync_status === "pending" || child.sync_status === "error" || hasQueueEntry(childType, child.local_id))) return true;
      }
    }
  }
  return true;
}

function resolveCatalog(db: ReturnType<typeof getDatabase>, table: string, remoteId: string | number) {
  const id = String(remoteId);
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  const hasServerId = columns.some((column) => column.name === "server_id");
  const row = db.getFirstSync<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ?${hasServerId ? " OR server_id = ?" : ""} LIMIT 1`,
    ...(hasServerId ? [id, id] : [id])
  );
  if (!row) throw new Error("Falta un catálogo necesario para recuperar la actividad. Actualiza los catálogos y reintenta.");
  return row.id;
}

function json(value: unknown) {
  return value == null ? null : typeof value === "string" ? value : JSON.stringify(value);
}
