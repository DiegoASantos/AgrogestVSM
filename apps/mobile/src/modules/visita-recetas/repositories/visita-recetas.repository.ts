import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type {
  CoadyuvanteCatalogItem,
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  ModoAccionCatalogItem,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem,
  FertilizanteCatalogItem,
  RecetaFitosanidad,
  RecetaFertilizacion,
  RecetaRiego,
  RecetaLabor,
  VisitaRecetaCompleta
} from "../types";

const DEFAULT_FERTILIZANTES: FertilizanteCatalogItem[] = [
  { id: "default-complejo-npk", name: "Complejo N-P-K", type: "solido" },
  { id: "default-calcio-boro-zinc", name: "Calcio-boro-zinc", type: "liquido" },
  { id: "default-acidos-fulvicos", name: "ácidos fulvicos", type: "liquido" }
];

type SyncStatus = "pending" | "synced" | "error";

type VisitaRecetaRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  etapa_fenologica: string | null;
  version: number;
  sync_status: SyncStatus;
  sync_error_message: string | null;
  created_at: string;
  updated_at: string;
};

type FitosanidadRow = {
  local_id: string;
  server_id: string | null;
  receta_local_id: string;
  numero: number;
  objetivo: "plaga" | "enfermedad";
  objetivo_nombre: string;
  tipo_control_id: string | null;
  tipo_producto_id: string | null;
  disolvente: string;
  modo_accion_id: string | null;
  ingrediente_activo_nombre: string | null;
  dosis_ia: string | null;
  volumen_aplicacion: string | null;
  cantidad_total_ia: string | null;
  marca_producto_nombre: string | null;
  concentracion_producto: string | null;
  cantidad_total_producto: string | null;
  coadyuvantes_ids: string | null;
  orden_mezcla: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type FertilizacionRow = {
  local_id: string;
  server_id: string | null;
  receta_local_id: string;
  via_aplicacion: "edafica" | "foliar";
  fertilizante_nombre: string | null;
  tipo_producto: "solido" | "liquido" | null;
  dosis: string | null;
  unidad_dosis: string | null;
  cantidad_total_plantas: string | null;
  volumen_aplicacion: string | null;
  cantidad_total_fertilizante: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type RiegoRow = {
  local_id: string;
  server_id: string | null;
  receta_local_id: string;
  tipo_recomendacion: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type LaborRow = {
  local_id: string;
  server_id: string | null;
  receta_local_id: string;
  labor: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function parseNullableNumeric(value: string | null): number | null {
  if (value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export const visitaRecetasRepository = {
  getCoadyuvantes(): CoadyuvanteCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      name: string;
      description: string | null;
    }>("SELECT id, name, description FROM coadyuvantes ORDER BY name ASC");
    return rows;
  },

  getIngredientesActivos(): IngredienteActivoCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      name: string;
      description: string | null;
    }>("SELECT id, name, description FROM ingredientes_activos ORDER BY name ASC");
    return rows;
  },

  getMarcasProducto(): MarcaProductoCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      name: string;
      tipo_producto_id: string | null;
      ingrediente_activo_id: string | null;
      concentracion: string | null;
      ingrediente_activo_nombre: string | null;
    }>(
      `SELECT id, name, tipo_producto_id, ingrediente_activo_id, concentracion, ingrediente_activo_nombre
       FROM marcas_producto ORDER BY name ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      tipoProductoId: r.tipo_producto_id,
      ingredienteActivoId: r.ingrediente_activo_id,
      ingredienteActivoNombre: r.ingrediente_activo_nombre,
      concentracion: r.concentracion ? Number(r.concentracion) : null
    }));
  },

  getModosAccion(): ModoAccionCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{ id: string; name: string }>(
      "SELECT id, name FROM modos_accion ORDER BY name ASC"
    );
    return rows;
  },

  getTiposControl(): TipoControlCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{ id: string; name: string }>(
      "SELECT id, name FROM tipos_control ORDER BY name ASC"
    );
    return rows;
  },

  getTiposProducto(): TipoProductoFitosanitarioCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{ id: string; name: string }>(
      "SELECT id, name FROM tipos_producto_fitosanitario ORDER BY name ASC"
    );
    return rows;
  },

  getFertilizantes(): FertilizanteCatalogItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<{
      id: string;
      name: string;
      type: "solido" | "liquido";
    }>("SELECT id, name, type FROM fertilizantes ORDER BY name ASC");
    return rows.length > 0 ? rows : DEFAULT_FERTILIZANTES;
  },

  getRecetaByVisitaLocalId(visitaLocalId: string): VisitaRecetaCompleta | null {
    const db = getDatabase();
    const recetaRow = db.getFirstSync<VisitaRecetaRow>(
      `SELECT local_id, server_id, visita_local_id, etapa_fenologica, version, sync_status, sync_error_message, created_at, updated_at
       FROM visita_recetas WHERE visita_local_id = ? LIMIT 1`,
      visitaLocalId
    );
    return recetaRow ? readRecetaFromRow(db, recetaRow) : null;
  },

  getRecetaByLocalId(recetaLocalId: string): VisitaRecetaCompleta | null {
    const db = getDatabase();
    const recetaRow = db.getFirstSync<VisitaRecetaRow>(
      `SELECT local_id, server_id, visita_local_id, etapa_fenologica, version, sync_status, sync_error_message, created_at, updated_at
       FROM visita_recetas WHERE local_id = ? LIMIT 1`,
      recetaLocalId
    );
    return recetaRow ? readRecetaFromRow(db, recetaRow) : null;
  },

  markSynced(recetaLocalId: string, serverId: string | null) {
    const db = getDatabase();
    const timestamp = getNowIsoString();

    db.runSync(
      `UPDATE visita_recetas
       SET server_id = ?, sync_status = 'synced', sync_error_message = NULL, updated_at = ?
       WHERE local_id = ?`,
      serverId,
      timestamp,
      recetaLocalId
    );
    db.runSync(
      `UPDATE visita_receta_fitosanidad
       SET sync_status = 'synced', updated_at = ?
       WHERE receta_local_id = ?`,
      timestamp,
      recetaLocalId
    );
    db.runSync(
      `UPDATE visita_receta_fertilizacion
       SET sync_status = 'synced', updated_at = ?
       WHERE receta_local_id = ?`,
      timestamp,
      recetaLocalId
    );
    db.runSync(
      `UPDATE visita_receta_riego
       SET sync_status = 'synced', updated_at = ?
       WHERE receta_local_id = ?`,
      timestamp,
      recetaLocalId
    );
    db.runSync(
      `UPDATE visita_receta_labores
       SET sync_status = 'synced', updated_at = ?
       WHERE receta_local_id = ?`,
      timestamp,
      recetaLocalId
    );
  },

  saveReceta(
    visitaLocalId: string,
    data: {
      etapaFenologica: string | null;
      fitosanidad: Array<{
        numero: number;
        objetivo: "plaga" | "enfermedad";
        objetivoNombre: string;
        tipoControlId: string | null;
        tipoProductoId: string | null;
        disolvente: string;
        modoAccionId: string | null;
        ingredienteActivoNombre: string | null;
        dosisIa: number | null;
        volumenAplicacion: number | null;
        cantidadTotalIa: number | null;
        marcaProductoNombre: string | null;
        concentracionProducto: number | null;
        cantidadTotalProducto: number | null;
        coadyuvantesIds: string | null;
        ordenMezcla: string | null;
      }>;
      fertilizacion: Array<{
        viaAplicacion: "edafica" | "foliar";
        fertilizanteNombre: string | null;
        tipoProducto: "solido" | "liquido" | null;
        dosis: number | null;
        unidadDosis: string | null;
        cantidadTotalPlantas: number | null;
        volumenAplicacion: number | null;
        cantidadTotalFertilizante: number | null;
      }>;
      riego: {
        tipoRecomendacion: string;
      } | null;
      labores: string[];
    }
  ): VisitaRecetaCompleta {
    const db = getDatabase();
    const timestamp = getNowIsoString();

    const existingReceta = db.getFirstSync<VisitaRecetaRow>(
      "SELECT local_id, server_id, version FROM visita_recetas WHERE visita_local_id = ? LIMIT 1",
      visitaLocalId
    );

    let recetaLocalId: string;
    let isNew = true;

    if (existingReceta) {
      recetaLocalId = existingReceta.local_id;
      const newVersion = existingReceta.version + 1;
      db.runSync(
        `UPDATE visita_recetas SET etapa_fenologica = ?, version = ?, updated_at = ?, sync_status = 'pending' WHERE local_id = ?`,
        data.etapaFenologica,
        newVersion,
        timestamp,
        recetaLocalId
      );
      db.runSync(
        "DELETE FROM visita_receta_fitosanidad WHERE receta_local_id = ?",
        recetaLocalId
      );
      db.runSync(
        "DELETE FROM visita_receta_fertilizacion WHERE receta_local_id = ?",
        recetaLocalId
      );
      db.runSync(
        "DELETE FROM visita_receta_riego WHERE receta_local_id = ?",
        recetaLocalId
      );
      db.runSync(
        "DELETE FROM visita_receta_labores WHERE receta_local_id = ?",
        recetaLocalId
      );
      isNew = false;
    } else {
      recetaLocalId = generateLocalId();
      db.runSync(
        `INSERT INTO visita_recetas (local_id, server_id, visita_local_id, etapa_fenologica, version, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, 'pending', ?, ?)`,
        recetaLocalId,
        null,
        visitaLocalId,
        data.etapaFenologica,
        timestamp,
        timestamp
      );
    }

    if (data.fitosanidad.length > 0) {
      const stmtFito = db.prepareSync(
        `INSERT INTO visita_receta_fitosanidad
         (local_id, server_id, receta_local_id, numero, objetivo, objetivo_nombre, tipo_control_id, tipo_producto_id,
          disolvente, modo_accion_id, ingrediente_activo_nombre, dosis_ia, volumen_aplicacion,
          cantidad_total_ia, marca_producto_nombre, concentracion_producto, cantidad_total_producto,
          coadyuvantes_ids, orden_mezcla, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      );
      for (const f of data.fitosanidad) {
        stmtFito.executeSync([
          generateLocalId(),
          null,
          recetaLocalId,
          f.numero,
          f.objetivo,
          f.objetivoNombre,
          f.tipoControlId,
          f.tipoProductoId,
          f.disolvente,
          f.modoAccionId,
          f.ingredienteActivoNombre,
          f.dosisIa?.toString() ?? null,
          f.volumenAplicacion?.toString() ?? null,
          f.cantidadTotalIa?.toString() ?? null,
          f.marcaProductoNombre,
          f.concentracionProducto?.toString() ?? null,
          f.cantidadTotalProducto?.toString() ?? null,
          f.coadyuvantesIds,
          f.ordenMezcla,
          timestamp,
          timestamp
        ]);
      }
      stmtFito.finalizeSync();
    }

    if (data.fertilizacion.length > 0) {
      const stmtFert = db.prepareSync(
        `INSERT INTO visita_receta_fertilizacion
         (local_id, server_id, receta_local_id, via_aplicacion, fertilizante_nombre, tipo_producto,
          dosis, unidad_dosis, cantidad_total_plantas, volumen_aplicacion, cantidad_total_fertilizante,
          sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      );
      for (const f of data.fertilizacion) {
        stmtFert.executeSync([
          generateLocalId(),
          null,
          recetaLocalId,
          f.viaAplicacion,
          f.fertilizanteNombre,
          f.tipoProducto,
          f.dosis?.toString() ?? null,
          f.unidadDosis,
          f.cantidadTotalPlantas?.toString() ?? null,
          f.volumenAplicacion?.toString() ?? null,
          f.cantidadTotalFertilizante?.toString() ?? null,
          timestamp,
          timestamp
        ]);
      }
      stmtFert.finalizeSync();
    }

    if (data.riego) {
      db.runSync(
        `INSERT INTO visita_receta_riego
         (local_id, server_id, receta_local_id, tipo_recomendacion, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        generateLocalId(),
        null,
        recetaLocalId,
        data.riego.tipoRecomendacion,
        timestamp,
        timestamp
      );
    }

    if (data.labores.length > 0) {
      const stmtLab = db.prepareSync(
        `INSERT INTO visita_receta_labores
         (local_id, server_id, receta_local_id, labor, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`
      );
      for (const labor of data.labores) {
        stmtLab.executeSync([
          generateLocalId(),
          null,
          recetaLocalId,
          labor,
          timestamp,
          timestamp
        ]);
      }
      stmtLab.finalizeSync();
    }

    const operation = isNew ? "create" : "update";
    insertSyncOutboxEntry(db, {
      entityType: "visita_recetas",
      entityLocalId: recetaLocalId,
      operation,
      createdAt: timestamp
    });

    const result = this.getRecetaByVisitaLocalId(visitaLocalId);
    if (!result) {
      throw new Error("No se pudo leer la receta guardada.");
    }
    return result;
  }
};

function readRecetaFromRow(
  db: ReturnType<typeof getDatabase>,
  recetaRow: VisitaRecetaRow
) {
  const recetaLocalId = recetaRow.local_id;

  const fitosanidadRows = db.getAllSync<FitosanidadRow>(
    `SELECT * FROM visita_receta_fitosanidad WHERE receta_local_id = ? ORDER BY numero ASC`,
    recetaLocalId
  );
  const fertilizacionRows = db.getAllSync<FertilizacionRow>(
    `SELECT * FROM visita_receta_fertilizacion WHERE receta_local_id = ? ORDER BY local_id ASC`,
    recetaLocalId
  );
  const riegoRow = db.getFirstSync<RiegoRow>(
    `SELECT * FROM visita_receta_riego WHERE receta_local_id = ? LIMIT 1`,
    recetaLocalId
  );
  const laboresRows = db.getAllSync<LaborRow>(
    `SELECT * FROM visita_receta_labores WHERE receta_local_id = ?`,
    recetaLocalId
  );

  return {
    id: recetaRow.local_id,
    serverId: recetaRow.server_id,
    visitaLocalId: recetaRow.visita_local_id,
    etapaFenologica: recetaRow.etapa_fenologica,
    version: recetaRow.version,
    syncStatus: recetaRow.sync_status,
    syncErrorMessage: recetaRow.sync_error_message,
    createdAt: recetaRow.created_at,
    updatedAt: recetaRow.updated_at,
    fitosanidad: fitosanidadRows.map(mapFitosanidadRow),
    fertilizacion: fertilizacionRows.map(mapFertilizacionRow),
    riego: riegoRow ? mapRiegoRow(riegoRow) : null,
    labores: laboresRows.map(mapLaborRow)
  } satisfies VisitaRecetaCompleta;
}

function mapFitosanidadRow(r: FitosanidadRow): RecetaFitosanidad {
  return {
    id: r.local_id,
    serverId: r.server_id,
    recetaLocalId: r.receta_local_id,
    numero: r.numero,
    objetivo: r.objetivo,
    objetivoNombre: r.objetivo_nombre,
    tipoControlId: r.tipo_control_id,
    tipoProductoId: r.tipo_producto_id,
    disolvente: r.disolvente,
    modoAccionId: r.modo_accion_id,
    ingredienteActivoNombre: r.ingrediente_activo_nombre,
    dosisIa: parseNullableNumeric(r.dosis_ia),
    volumenAplicacion: parseNullableNumeric(r.volumen_aplicacion),
    cantidadTotalIa: parseNullableNumeric(r.cantidad_total_ia),
    marcaProductoNombre: r.marca_producto_nombre,
    concentracionProducto: parseNullableNumeric(r.concentracion_producto),
    cantidadTotalProducto: parseNullableNumeric(r.cantidad_total_producto),
    coadyuvantesIds: r.coadyuvantes_ids,
    ordenMezcla: r.orden_mezcla,
    syncStatus: r.sync_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapFertilizacionRow(r: FertilizacionRow): RecetaFertilizacion {
  return {
    id: r.local_id,
    serverId: r.server_id,
    recetaLocalId: r.receta_local_id,
    viaAplicacion: r.via_aplicacion,
    fertilizanteNombre: r.fertilizante_nombre,
    tipoProducto: r.tipo_producto,
    dosis: parseNullableNumeric(r.dosis),
    unidadDosis: r.unidad_dosis,
    cantidadTotalPlantas: r.cantidad_total_plantas
      ? Number(r.cantidad_total_plantas)
      : null,
    volumenAplicacion: parseNullableNumeric(r.volumen_aplicacion),
    cantidadTotalFertilizante: parseNullableNumeric(r.cantidad_total_fertilizante),
    syncStatus: r.sync_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapRiegoRow(r: RiegoRow): RecetaRiego {
  return {
    id: r.local_id,
    serverId: r.server_id,
    recetaLocalId: r.receta_local_id,
    tipoRecomendacion: r.tipo_recomendacion as RecetaRiego["tipoRecomendacion"],
    syncStatus: r.sync_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapLaborRow(r: LaborRow): RecetaLabor {
  return {
    id: r.local_id,
    serverId: r.server_id,
    recetaLocalId: r.receta_local_id,
    labor: r.labor as RecetaLabor["labor"],
    syncStatus: r.sync_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
