import { resolveNutritionIncidence } from "../../../evaluaciones/domain/nutrition-incidence";
import { resolveDiseaseIncidenceGrade } from "../../../observaciones-sanitarias/domain/disease-incidence";
import type { PestDiseaseCatalogItem } from "../../../observaciones-sanitarias/types";
import type { NutrientCatalogItem } from "../../../nutricion/types";
import type { SaveRecetaData } from "../../services";
import type {
  CoadyuvanteCatalogItem,
  FertilizanteCatalogItem,
  IngredienteActivoCatalogItem,
  ModoAccionCatalogItem,
  MarcaProductoCatalogItem,
  ConsolidacionHallazgo,
  RecetaFertilizacion,
  RecetaMezcla,
  RecommendationApproach,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem
} from "../../types";
import { resolveIngredientId } from "./visita-receta-selection";

export const DOSIS_UNITS = ["mg", "g", "kg", "ml", "l"] as const;
export type DosisUnit = (typeof DOSIS_UNITS)[number];

const SOLID_DOSIS_UNITS: readonly DosisUnit[] = ["mg", "g", "kg"];
const LIQUID_DOSIS_UNITS: readonly DosisUnit[] = ["ml", "l"];

export type AppIngrediente = {
  localId: string;
  mezclaNumero: number;
  tipoProductoId: string;
  modoAccionId: string;
  ingredienteActivoId: string;
  ingredienteActivoNombre: string;
  dosisProducto: string;
  unidadDosis?: string;
  marcaProductoNombre: string;
  concentracionProducto: string;
  unidadMedidaProducto: string;
  cantidadTotalProducto: string;
};

export type AppFitosanidad = {
  localId: string;
  numero: number;
  objetivo: "plaga" | "enfermedad";
  objetivoNombre: string;
  enfoque?: RecommendationApproach;
  objetivoId?: string | null;
  incidenceGrade: number;
  severityGrade?: number | null;
  tipoControlId: string;
  disolvente: string;
  ingredientes: AppIngrediente[];
};

export type AppMezcla = {
  localId: string;
  numero: number;
  frecuenciaDosis: string;
  volumenAplicacion: string;
  coadyuvantesIds: string[];
  coadyuvantesDosis?: Record<string, string>;
  ordenMezcla: string[];
  factor: string;
  factorEditable: boolean;
  cantidadTotalProducto: string;
};

export type AppFertilizacion = {
  localId: string;
  mezclaNumero: number;
  enfoque?: RecommendationApproach;
  nutrienteId: string | null;
  nutrienteNombre: string;
  incidenceGrade: number | null;
  viaAplicacion: "edafica" | "foliar";
  fertilizanteNombre: string;
  tipoProducto: "solido" | "liquido";
  concentracion: string;
  unidadMedida: string;
  dosis: string;
  unidadDosis: string;
  cantidadTotalPlantas: string;
  volumenAplicacion: string;
  factor: string;
  factorEditable: boolean;
  cantidadTotalFertilizante: string;
};

let transientIdSequence = 0;

export function createEmptyIngrediente(mezclaNumero = 0): AppIngrediente {
  return {
    localId: createTransientId("ingrediente"),
    mezclaNumero,
    tipoProductoId: "",
    modoAccionId: "",
    ingredienteActivoId: "",
    ingredienteActivoNombre: "",
    dosisProducto: "",
    unidadDosis: "",
    marcaProductoNombre: "",
    concentracionProducto: "",
    unidadMedidaProducto: "",
    cantidadTotalProducto: ""
  };
}

export function createEmptyMezcla(numero: number, volumenAplicacion = ""): AppMezcla {
  return {
    localId: createTransientId("mezcla"),
    numero,
    frecuenciaDosis: "",
    volumenAplicacion,
    coadyuvantesIds: [],
    coadyuvantesDosis: {},
    ordenMezcla: [],
    factor: "1",
    factorEditable: false,
    cantidadTotalProducto: ""
  };
}

export function createEmptyFertilizacion(
  volumenAplicacion = "",
  target?: {
    nutrienteId: string | null;
    nutrienteNombre: string;
    enfoque: RecommendationApproach;
    incidenceGrade?: number | null;
  }
): AppFertilizacion {
  const grade = target?.incidenceGrade ?? 0;
  return {
    localId: createTransientId("fertilizante"),
    mezclaNumero: 0,
    enfoque: target?.enfoque ?? "reactivo",
    nutrienteId: target?.nutrienteId ?? null,
    nutrienteNombre: target?.nutrienteNombre ?? "",
    incidenceGrade: target?.incidenceGrade ?? null,
    viaAplicacion: "edafica",
    fertilizanteNombre: "",
    tipoProducto: "solido",
    concentracion: "",
    unidadMedida: "",
    dosis: "",
    unidadDosis: "",
    cantidadTotalPlantas: "",
    volumenAplicacion,
    factor: target?.enfoque === "preventivo" ? "1" : factorFromGrade(grade).toString(),
    factorEditable: target?.enfoque !== "preventivo" && grade === 3,
    cantidadTotalFertilizante: ""
  };
}

type RecetaDraftCatalogs = {
  coadyuvantes: CoadyuvanteCatalogItem[];
  ingredientesActivos: IngredienteActivoCatalogItem[];
  marcasProducto: MarcaProductoCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  tiposControl: TipoControlCatalogItem[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  fertilizantes: FertilizanteCatalogItem[];
};

export function resolveDefaultControlId(catalog: TipoControlCatalogItem[]) {
  return catalog.find((item) => normalizeName(item.name) === "quimico")?.id ?? "";
}

export function applyDefaultFitosanidadControl(
  applications: AppFitosanidad[],
  catalog: TipoControlCatalogItem[]
) {
  const defaultControlId = resolveDefaultControlId(catalog);
  if (!defaultControlId) return applications;

  return applications.map((application) =>
    application.tipoControlId
      ? application
      : { ...application, tipoControlId: defaultControlId }
  );
}

export function sanitizeDraftFitosanidad(
  applications: AppFitosanidad[],
  catalogs: RecetaDraftCatalogs
): AppFitosanidad[] {
  const validControlIds = new Set(catalogs.tiposControl.map((item) => item.id));
  const defaultControlId = resolveDefaultControlId(catalogs.tiposControl);
  const validModeIds = new Set(catalogs.modosAccion.map((item) => item.id));
  const validProductTypeIds = new Set(catalogs.tiposProducto.map((item) => item.id));
  const ingredientById = new Map(
    catalogs.ingredientesActivos.map((item) => [item.id, item])
  );

  return applications.map((application) => ({
    ...application,
    tipoControlId: validControlIds.has(application.tipoControlId)
      ? application.tipoControlId
      : defaultControlId,
    ingredientes: application.ingredientes.map((ingredient) => {
      const tipoProductoId = validProductTypeIds.has(ingredient.tipoProductoId)
        ? ingredient.tipoProductoId
        : "";
      const selectedIngredient = ingredientById.get(ingredient.ingredienteActivoId);
      const brandCandidates = selectedIngredient
        ? catalogs.marcasProducto.filter(
            (brand) =>
              normalizeName(brand.name) ===
                normalizeName(ingredient.marcaProductoNombre) &&
              Boolean(
                brand.tipoProductoId && validProductTypeIds.has(brand.tipoProductoId)
              ) &&
              brand.ingredienteActivoId === selectedIngredient.id
          )
        : [];
      const selectedBrand = tipoProductoId
        ? brandCandidates.find((brand) => brand.tipoProductoId === tipoProductoId)
        : brandCandidates.length === 1
          ? brandCandidates[0]
          : undefined;

      return {
        ...ingredient,
        tipoProductoId: selectedBrand?.tipoProductoId ?? tipoProductoId,
        modoAccionId: validModeIds.has(ingredient.modoAccionId)
          ? ingredient.modoAccionId
          : "",
        ingredienteActivoId: selectedIngredient?.id ?? "",
        ingredienteActivoNombre: selectedIngredient?.name ?? "",
        marcaProductoNombre: selectedBrand?.name ?? "",
        concentracionProducto: selectedBrand
          ? (selectedBrand.concentracionTexto ??
            selectedBrand.concentracion?.toString() ??
            "")
          : "",
        unidadMedidaProducto: selectedBrand?.unidadMedida ?? ""
      };
    })
  }));
}

export function sanitizeDraftMezclas(
  mezclas: AppMezcla[],
  applications: AppFitosanidad[],
  coadyuvantes: CoadyuvanteCatalogItem[]
): AppMezcla[] {
  const coadyuvanteById = new Map(coadyuvantes.map((item) => [item.id, item]));

  return mezclas.map((mezcla) => {
    const coadyuvantesIds = mezcla.coadyuvantesIds.filter((id) =>
      coadyuvanteById.has(id)
    );
    const allowedOrderItems = new Set([
      "Agua",
      ...coadyuvantesIds
        .map((id) => coadyuvanteById.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
      ...applications.flatMap((application) =>
        application.ingredientes
          .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
          .map((ingredient) => ingredient.marcaProductoNombre)
          .filter(Boolean)
      )
    ]);

    return {
      ...mezcla,
      frecuenciaDosis: mezcla.frecuenciaDosis ?? "",
      coadyuvantesIds,
      coadyuvantesDosis: Object.fromEntries(
        Object.entries(mezcla.coadyuvantesDosis ?? {}).filter(([id]) =>
          coadyuvantesIds.includes(id)
        )
      ),
      ordenMezcla: mezcla.ordenMezcla.filter((item) => allowedOrderItems.has(item))
    };
  });
}

export function sanitizeDraftFertilizaciones(
  fertilizaciones: AppFertilizacion[],
  catalog: FertilizanteCatalogItem[]
): AppFertilizacion[] {
  return fertilizaciones
    .map((fertilizacion) => {
      const normalized = {
        ...fertilizacion,
        mezclaNumero: fertilizacion.mezclaNumero ?? 0,
        nutrienteId: fertilizacion.nutrienteId ?? null,
        nutrienteNombre: fertilizacion.nutrienteNombre ?? "",
        incidenceGrade: fertilizacion.incidenceGrade ?? null
      };
      if (!normalized.fertilizanteNombre.trim()) {
        return normalized;
      }

      const selected = catalog.find(
        (item) =>
          normalizeName(item.name) === normalizeName(normalized.fertilizanteNombre)
      );

      return {
        ...normalized,
        fertilizanteNombre: selected?.name ?? "",
        tipoProducto: selected?.type ?? normalized.tipoProducto,
        concentracion: selected?.concentracion ?? "",
        unidadMedida: selected?.unidadMedida ?? ""
      };
    })
    .filter(
      (fertilizacion) =>
        Boolean(fertilizacion.nutrienteId) || hasFertilizacionProductData(fertilizacion)
    );
}

export function mergeMissingFitosanidadFindings(
  applications: AppFitosanidad[],
  consolidation: ConsolidacionHallazgo,
  defaultControlId = ""
): { applications: AppFitosanidad[]; addedCount: number } {
  const existingKeys = new Set(
    applications.map((application) =>
      [application.objetivo, normalizeName(application.objetivoNombre)].join("::")
    )
  );
  const merged = [...applications];
  let nextNumber = applications.reduce(
    (maximum, application) => Math.max(maximum, application.numero),
    0
  );

  const appendFinding = (
    objetivo: AppFitosanidad["objetivo"],
    finding: ConsolidacionHallazgo["plagas"][number]
  ) => {
    const key = [objetivo, normalizeName(finding.nombre)].join("::");
    if (existingKeys.has(key)) return;

    existingKeys.add(key);
    nextNumber += 1;
    merged.push({
      localId: createTransientId("fito"),
      numero: nextNumber,
      objetivo,
      objetivoNombre: finding.nombre,
      enfoque: "reactivo",
      objetivoId: finding.objetivoId ?? null,
      incidenceGrade: finding.incidenceGrade,
      severityGrade: null,
      tipoControlId: defaultControlId,
      disolvente: "Agua",
      ingredientes: [createEmptyIngrediente(0)]
    });
  };

  consolidation.plagas
    .filter((finding) => finding.incidenceGrade > 0)
    .forEach((finding) => appendFinding("plaga", finding));
  consolidation.enfermedades
    .filter((finding) => finding.incidenceGrade > 0)
    .forEach((finding) => appendFinding("enfermedad", finding));

  return {
    applications: merged,
    addedCount: merged.length - applications.length
  };
}

export function excludeLocallyDeletedFitosanidadFindings(
  consolidation: ConsolidacionHallazgo,
  deletedTargetIds: ReadonlySet<string>
): ConsolidacionHallazgo {
  if (deletedTargetIds.size === 0) return consolidation;

  return {
    ...consolidation,
    plagas: consolidation.plagas.filter(
      (finding) => !finding.objetivoId || !deletedTargetIds.has(finding.objetivoId)
    ),
    enfermedades: consolidation.enfermedades.filter(
      (finding) => !finding.objetivoId || !deletedTargetIds.has(finding.objetivoId)
    )
  };
}

export function discardEmptyReactiveApplicationsForDeletedTargets(
  applications: AppFitosanidad[],
  deletedTargetIds: ReadonlySet<string>
) {
  if (deletedTargetIds.size === 0) return applications;

  return applications.filter(
    (application) =>
      application.enfoque === "preventivo" ||
      !application.objetivoId ||
      !deletedTargetIds.has(application.objetivoId) ||
      hasFitosanidadData([application])
  );
}

export function discardEmptyReactiveApplicationsWithoutActiveFindings(
  applications: AppFitosanidad[],
  consolidation: ConsolidacionHallazgo
) {
  const activeTargetIds = new Set<string>();
  const activeTargetKeys = new Set<string>();
  const addFinding = (
    objetivo: AppFitosanidad["objetivo"],
    finding: ConsolidacionHallazgo["plagas"][number]
  ) => {
    if (finding.incidenceGrade <= 0) return;
    if (finding.objetivoId) activeTargetIds.add(finding.objetivoId);
    activeTargetKeys.add([objetivo, normalizeName(finding.nombre)].join("::"));
  };

  consolidation.plagas.forEach((finding) => addFinding("plaga", finding));
  consolidation.enfermedades.forEach((finding) => addFinding("enfermedad", finding));

  return applications.filter((application) => {
    if (application.enfoque === "preventivo" || hasFitosanidadData([application])) {
      return true;
    }

    const targetKey = [
      application.objetivo,
      normalizeName(application.objetivoNombre)
    ].join("::");

    return Boolean(
      (application.objetivoId && activeTargetIds.has(application.objetivoId)) ||
      activeTargetKeys.has(targetKey)
    );
  });
}

export function createPreventiveFitosanidad(
  numero: number,
  objetivo: AppFitosanidad["objetivo"],
  objetivoId: string,
  objetivoNombre: string,
  defaultControlId = ""
): AppFitosanidad {
  return {
    localId: createTransientId("fito-preventivo"),
    numero,
    objetivo,
    objetivoNombre,
    enfoque: "preventivo",
    objetivoId,
    incidenceGrade: 0,
    severityGrade: 0,
    tipoControlId: defaultControlId,
    disolvente: "Agua",
    ingredientes: [createEmptyIngrediente(0)]
  };
}

export function getAvailablePreventiveTargets(
  targets: PestDiseaseCatalogItem[],
  consolidation: ConsolidacionHallazgo | null,
  applications: AppFitosanidad[],
  objectiveType: AppFitosanidad["objetivo"]
) {
  const findings = [
    ...(consolidation?.plagas ?? []),
    ...(consolidation?.enfermedades ?? [])
  ];
  const positiveIds = new Set(
    findings
      .filter((finding) => finding.incidenceGrade > 0)
      .map((finding) => finding.objetivoId)
      .filter((id): id is string => Boolean(id))
  );
  const positiveNames = new Set(
    findings
      .filter((finding) => finding.incidenceGrade > 0)
      .map((finding) => normalizeName(finding.nombre))
  );
  const preventiveIds = new Set(
    applications
      .filter((application) => application.enfoque === "preventivo")
      .map((application) => application.objetivoId)
      .filter((id): id is string => Boolean(id))
  );

  return targets.filter(
    (target) =>
      target.isActive &&
      target.type === objectiveType &&
      !positiveIds.has(target.id) &&
      !positiveNames.has(normalizeName(target.name)) &&
      !preventiveIds.has(target.id)
  );
}

export function appendMezclasForNewFindings(
  mezclas: AppMezcla[],
  addedCount: number,
  defaultVolume = ""
) {
  if (addedCount <= 0) return mezclas;

  const startNumber = mezclas.reduce(
    (maximum, mezcla) => Math.max(maximum, mezcla.numero),
    0
  );
  const inheritedVolume = mezclas[0]?.volumenAplicacion ?? defaultVolume;

  return [
    ...mezclas,
    ...Array.from({ length: addedCount }, (_, index) =>
      createEmptyMezcla(startNumber + index + 1, inheritedVolume)
    )
  ];
}

export function restoreFitosanidadApps(
  mezclas: RecetaMezcla[],
  ingredientCatalog: IngredienteActivoCatalogItem[],
  commercialCatalog: MarcaProductoCatalogItem[]
): AppFitosanidad[] {
  const groups = new Map<string, AppFitosanidad>();

  for (const mezcla of mezclas) {
    for (const row of mezcla.productos) {
      const key = [
        row.enfoque ?? "reactivo",
        row.objetivo,
        row.objetivoId ?? normalizeName(row.objetivoNombre)
      ].join("::");
      const ingredient = restoreIngrediente(
        row,
        mezcla.numero,
        ingredientCatalog,
        commercialCatalog
      );
      const existing = groups.get(key);

      if (existing) {
        if (!existing.ingredientes.some((item) => item.localId === ingredient.localId)) {
          existing.ingredientes.push(ingredient);
        }
      } else {
        groups.set(key, {
          localId: `fito_${row.id}`,
          numero: groups.size + 1,
          objetivo: row.objetivo,
          objetivoNombre: row.objetivoNombre,
          enfoque: row.enfoque ?? "reactivo",
          objetivoId: row.objetivoId,
          incidenceGrade: row.incidenciaGrado ?? factorToGrade(mezcla.factor),
          severityGrade: row.severidadGrado,
          tipoControlId: row.tipoControlId ?? "",
          disolvente: row.disolvente,
          ingredientes: [ingredient]
        });
      }
    }
  }

  return [...groups.values()];
}

export function restoreMezclas(rows: RecetaMezcla[]): AppMezcla[] {
  return rows.map((row) => ({
    localId: `mezcla_${row.id}`,
    numero: row.numero,
    frecuenciaDosis: row.frecuenciaDosis ?? "",
    volumenAplicacion: row.volumenAplicacion?.toString() ?? "",
    coadyuvantesIds: parseJsonArray(row.coadyuvantesIds),
    coadyuvantesDosis: parseJsonRecord(row.coadyuvantesDosis ?? null),
    ordenMezcla: parseJsonArray(row.ordenMezcla),
    factor: row.factor.toString(),
    factorEditable: row.factorEditable,
    cantidadTotalProducto: row.cantidadTotalProducto?.toString() ?? ""
  }));
}

export function restoreFertilizaciones(
  rows: RecetaFertilizacion[],
  fertilizerCatalog: FertilizanteCatalogItem[]
): AppFertilizacion[] {
  const uniqueRows = [
    ...new Map(
      rows.map((row) => [row.productoRef ?? `legacy-fert-${row.id}`, row])
    ).values()
  ];
  return uniqueRows.map((row) => {
    const catalogProduct = fertilizerCatalog.find(
      (product) =>
        normalizeName(product.name) === normalizeName(row.fertilizanteNombre ?? "")
    );

    return {
      localId: row.productoRef ?? `legacy-fert-${row.id}`,
      mezclaNumero: row.mezclaNumero ?? 0,
      enfoque: row.enfoque ?? "reactivo",
      nutrienteId: row.nutrienteId ?? null,
      nutrienteNombre: row.nutrienteNombre ?? "",
      incidenceGrade: null,
      viaAplicacion: row.viaAplicacion,
      fertilizanteNombre: row.fertilizanteNombre ?? "",
      tipoProducto: row.tipoProducto ?? "solido",
      concentracion: catalogProduct?.concentracion ?? "",
      unidadMedida: catalogProduct?.unidadMedida ?? "",
      dosis: row.dosis?.toString() ?? "",
      unidadDosis: normalizeFertilizacionUnidadDosis(row.unidadDosis, row.viaAplicacion),
      cantidadTotalPlantas: row.cantidadTotalPlantas?.toString() ?? "",
      volumenAplicacion: row.volumenAplicacion?.toString() ?? "",
      factor: row.factor.toString(),
      factorEditable: row.factor >= 1.5,
      cantidadTotalFertilizante: formatCalculatedField(row.cantidadTotalFertilizante)
    };
  });
}

export function buildMezclasForSave(
  applications: AppFitosanidad[],
  mezclas: AppMezcla[]
): SaveRecetaData["mezclas"] {
  return mezclas.map((mezcla) => {
    const productos = applications.flatMap((application) =>
      application.ingredientes
        .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
        .map((ingredient) => ({
          productoRef: ingredient.localId,
          objetivo: application.objetivo,
          objetivoNombre: application.objetivoNombre,
          enfoque: application.enfoque ?? "reactivo",
          objetivoId: application.objetivoId ?? null,
          incidenciaGrado: application.incidenceGrade,
          severidadGrado: application.severityGrade ?? null,
          tipoControlId: application.tipoControlId || null,
          tipoProductoId: ingredient.tipoProductoId || null,
          disolvente: application.disolvente,
          modoAccionId: ingredient.modoAccionId || null,
          ingredienteActivoNombre: ingredient.ingredienteActivoNombre || null,
          dosisProducto: parsePositiveDecimal(ingredient.dosisProducto),
          unidadDosis: ingredient.unidadDosis || null,
          marcaProductoNombre: ingredient.marcaProductoNombre || null,
          concentracionProducto: parsePositiveDecimal(ingredient.concentracionProducto),
          cantidadTotalProducto:
            calculateTotal(
              ingredient.dosisProducto,
              mezcla.volumenAplicacion,
              mezcla.factor
            ) || null
        }))
    );
    return {
      numero: mezcla.numero,
      frecuenciaDosis: (mezcla.frecuenciaDosis ?? "").trim(),
      coadyuvantesIds:
        mezcla.coadyuvantesIds.length > 0 ? JSON.stringify(mezcla.coadyuvantesIds) : null,
      coadyuvantesDosis:
        mezcla.coadyuvantesIds.length > 0
          ? JSON.stringify(mezcla.coadyuvantesDosis ?? {})
          : null,
      ordenMezcla:
        mezcla.ordenMezcla.length > 0 ? JSON.stringify(mezcla.ordenMezcla) : null,
      volumenAplicacion: parsePositiveDecimal(mezcla.volumenAplicacion),
      factor: parsePositiveDecimal(mezcla.factor) ?? 1,
      factorEditable: mezcla.factorEditable,
      cantidadTotalProducto:
        productos.reduce((sum, p) => sum + (p.cantidadTotalProducto ?? 0), 0) || null,
      productos
    };
  });
}

export function buildFertilizacionesForSave(
  fertilizaciones: AppFertilizacion[]
): SaveRecetaData["fertilizacion"] {
  return fertilizaciones.filter(hasFertilizacionProductData).map((fertilizacion) => {
    const unidadDosis = getUnidadDosis(fertilizacion);
    return {
      productoRef: fertilizacion.localId,
      mezclaNumero: fertilizacion.mezclaNumero || null,
      enfoque: fertilizacion.enfoque ?? "reactivo",
      nutrienteId: fertilizacion.nutrienteId,
      nutrienteNombre: fertilizacion.nutrienteNombre || null,
      viaAplicacion: fertilizacion.viaAplicacion,
      fertilizanteNombre: fertilizacion.fertilizanteNombre || null,
      tipoProducto: fertilizacion.tipoProducto,
      dosis: parsePositiveDecimal(fertilizacion.dosis),
      unidadDosis: unidadDosis || null,
      cantidadTotalPlantas: toPositiveInteger(fertilizacion.cantidadTotalPlantas),
      volumenAplicacion: parsePositiveDecimal(fertilizacion.volumenAplicacion),
      factor: parsePositiveDecimal(fertilizacion.factor) ?? 1,
      cantidadTotalFertilizante: parsePositiveDecimal(
        fertilizacion.cantidadTotalFertilizante
      )
    };
  });
}

export function collectNomenclaturaPorMezcla(
  applications: AppFitosanidad[],
  mezclas: AppMezcla[],
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  const coadyuvanteById = new Map(coadyuvantes.map((item) => [item.id, item.name]));

  return mezclas.map((mezcla) => ({
    numero: mezcla.numero,
    nombres: uniqueNames([
      ...applications.flatMap((application) =>
        application.ingredientes
          .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
          .flatMap((ingredient) => [
            ingredient.ingredienteActivoNombre,
            ingredient.marcaProductoNombre
          ])
      ),
      ...mezcla.coadyuvantesIds.map((id) => coadyuvanteById.get(id) ?? "")
    ])
  }));
}

export function recalculateIngrediente(
  ingredient: AppIngrediente,
  mezcla: AppMezcla | undefined
): AppIngrediente {
  const total = mezcla
    ? calculateTotal(ingredient.dosisProducto, mezcla.volumenAplicacion, mezcla.factor)
    : 0;
  return { ...ingredient, cantidadTotalProducto: total ? total.toFixed(2) : "" };
}

export function recalculateFertilizacion(
  fertilizacion: AppFertilizacion
): AppFertilizacion {
  const volumen =
    fertilizacion.viaAplicacion === "edafica"
      ? fertilizacion.cantidadTotalPlantas
      : fertilizacion.volumenAplicacion;
  const total = calculateTotal(fertilizacion.dosis, volumen, fertilizacion.factor);
  return {
    ...fertilizacion,
    cantidadTotalFertilizante: total ? total.toFixed(4) : ""
  };
}

export function applyFertilizacionApproachFactor(
  fertilizaciones: AppFertilizacion[],
  changedIndex: number,
  reactiveGrades: number[]
) {
  const changed = fertilizaciones[changedIndex];
  if (!changed) return fertilizaciones;

  const approachAdjusted =
    changed.enfoque === "preventivo"
      ? { ...changed, factor: "1", factorEditable: false }
      : (() => {
          const reactiveIndex =
            fertilizaciones
              .slice(0, changedIndex + 1)
              .filter((item) => item.enfoque !== "preventivo").length - 1;
          const grade = reactiveGrades[reactiveIndex] ?? 0;
          return {
            ...changed,
            factor: factorFromGrade(grade).toString(),
            factorEditable: grade === 3
          };
        })();

  return fertilizaciones.map((item, currentIndex) =>
    currentIndex === changedIndex ? recalculateFertilizacion(approachAdjusted) : item
  );
}

export function deriveMezclaFactors(
  applications: AppFitosanidad[],
  mezclas: AppMezcla[]
) {
  return mezclas.map((mezcla) => {
    const maxGrade = applications.reduce((current, application) => {
      const assigned = application.ingredientes.some(
        (ingredient) => ingredient.mezclaNumero === mezcla.numero
      );
      return assigned ? Math.max(current, application.incidenceGrade) : current;
    }, 0);
    const factor = factorFromGrade(maxGrade);
    return {
      ...mezcla,
      factor: mezcla.factorEditable && maxGrade === 3 ? mezcla.factor : factor.toString(),
      factorEditable: maxGrade === 3
    };
  });
}

export function factorFromGrade(grade: number) {
  if (grade >= 3) return 1.5;
  if (grade === 2) return 1.2;
  return 1;
}

export function diseaseFactorFromPercentage(percentage: number) {
  return factorFromGrade(resolveDiseaseIncidenceGrade(percentage));
}

export function nutritionFactorFromPercentage(percentage: number) {
  return factorFromGrade(resolveNutritionIncidence(percentage).grade);
}

export function hasFitosanidadData(applications: AppFitosanidad[]) {
  return applications.some(
    (application) =>
      application.enfoque === "preventivo" ||
      application.ingredientes.some((ingredient) =>
        Boolean(
          ingredient.tipoProductoId ||
          ingredient.modoAccionId ||
          ingredient.ingredienteActivoNombre.trim() ||
          ingredient.dosisProducto.trim() ||
          ingredient.marcaProductoNombre.trim()
        )
      )
  );
}

export function hasFertilizacionData(fertilizaciones: AppFertilizacion[]) {
  return fertilizaciones.some(hasFertilizacionProductData);
}

function hasFertilizacionProductData(fertilizacion: AppFertilizacion) {
  return Boolean(
    fertilizacion.fertilizanteNombre.trim() ||
    fertilizacion.dosis.trim() ||
    fertilizacion.cantidadTotalPlantas.trim() ||
    fertilizacion.volumenAplicacion.trim()
  );
}

export function mergeNutritionFertilizations(
  fertilizaciones: AppFertilizacion[],
  consolidation: ConsolidacionHallazgo,
  defaultVolume = ""
): AppFertilizacion[] {
  const findingsById = new Map(
    consolidation.nutricion
      .filter((finding) => Boolean(finding.nutrienteId))
      .map((finding) => [finding.nutrienteId as string, finding])
  );
  const reconciled = fertilizaciones.map((item) => {
    const finding = item.nutrienteId ? findingsById.get(item.nutrienteId) : undefined;
    if (!finding) {
      return item.nutrienteId
        ? recalculateFertilizacion({
            ...item,
            enfoque: "preventivo",
            incidenceGrade: 0,
            factor: "1",
            factorEditable: false
          })
        : item;
    }
    const factor = factorFromGrade(finding.incidenceGrade);
    return recalculateFertilizacion({
      ...item,
      enfoque: "reactivo",
      nutrienteNombre: finding.elemento,
      incidenceGrade: finding.incidenceGrade,
      factor:
        item.factorEditable && finding.incidenceGrade === 3
          ? item.factor
          : factor.toString(),
      factorEditable: finding.incidenceGrade === 3
    });
  });
  const existingIds = new Set(
    reconciled.map((item) => item.nutrienteId).filter((id): id is string => Boolean(id))
  );
  for (const finding of consolidation.nutricion) {
    if (!finding.nutrienteId || existingIds.has(finding.nutrienteId)) continue;
    reconciled.push(
      createEmptyFertilizacion(defaultVolume, {
        nutrienteId: finding.nutrienteId,
        nutrienteNombre: finding.elemento,
        enfoque: "reactivo",
        incidenceGrade: finding.incidenceGrade
      })
    );
    existingIds.add(finding.nutrienteId);
  }
  return reconciled;
}

export function getAvailablePreventiveNutrients(
  nutrients: NutrientCatalogItem[],
  consolidation: ConsolidacionHallazgo | null,
  fertilizaciones: AppFertilizacion[]
) {
  const evaluatedIds = new Set(
    (consolidation?.nutricion ?? [])
      .map((finding) => finding.nutrienteId)
      .filter((id): id is string => Boolean(id))
  );
  const usedIds = new Set(
    fertilizaciones
      .map((item) => item.nutrienteId)
      .filter((id): id is string => Boolean(id))
  );
  return nutrients.filter(
    (nutrient) =>
      nutrient.isActive && !evaluatedIds.has(nutrient.id) && !usedIds.has(nutrient.id)
  );
}

export function createPreventiveFertilizacion(
  nutrient: NutrientCatalogItem | null,
  defaultVolume = ""
) {
  return createEmptyFertilizacion(defaultVolume, {
    nutrienteId: nutrient?.id ?? null,
    nutrienteNombre: nutrient?.name ?? "",
    enfoque: "preventivo",
    incidenceGrade: 0
  });
}

export function parsePositiveDecimal(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculateTotal(
  dosis: string | number | null | undefined,
  volumen: string | number | null | undefined,
  factor: string | number | null | undefined
) {
  const parsedDosis = parsePositiveDecimal(dosis);
  const parsedVolumen = parsePositiveDecimal(volumen);
  const parsedFactor = parsePositiveDecimal(factor) ?? 1;
  return parsedDosis && parsedVolumen ? parsedDosis * parsedVolumen * parsedFactor : 0;
}

export function getUnidadDosis(fertilizacion: AppFertilizacion) {
  const unit = getDosisUnit(fertilizacion.unidadDosis);
  return unit ? buildFertilizacionUnidadDosis(unit, fertilizacion.viaAplicacion) : "";
}

export function getDosisUnit(value: string | null | undefined): DosisUnit | "" {
  const unit = value?.split("/")[0]?.trim().toLowerCase();
  return DOSIS_UNITS.includes(unit as DosisUnit) ? (unit as DosisUnit) : "";
}

export function buildFitosanidadUnidadDosis(unit: DosisUnit) {
  return `${unit}/cilindro`;
}

export function buildFertilizacionUnidadDosis(
  unit: DosisUnit,
  viaAplicacion: AppFertilizacion["viaAplicacion"]
) {
  return `${unit}/${viaAplicacion === "edafica" ? "planta" : "cilindro"}`;
}

export function getFertilizacionDosisUnits(
  tipoProducto: AppFertilizacion["tipoProducto"]
) {
  return tipoProducto === "liquido" ? LIQUID_DOSIS_UNITS : SOLID_DOSIS_UNITS;
}

export function isValidFertilizacionUnidadDosis(fertilizacion: AppFertilizacion) {
  const unit = getDosisUnit(fertilizacion.unidadDosis);
  return Boolean(
    unit && getFertilizacionDosisUnits(fertilizacion.tipoProducto).includes(unit)
  );
}

function restoreIngrediente(
  row: RecetaMezcla["productos"][number],
  mezclaNumero: number,
  ingredientCatalog: IngredienteActivoCatalogItem[],
  commercialCatalog: MarcaProductoCatalogItem[]
): AppIngrediente {
  const catalogProduct = commercialCatalog.find(
    (product) =>
      normalizeName(product.name) === normalizeName(row.marcaProductoNombre ?? "")
  );
  return {
    localId: row.productoRef ?? `legacy-fito-${row.id}`,
    mezclaNumero,
    tipoProductoId: row.tipoProductoId ?? "",
    modoAccionId: row.modoAccionId ?? "",
    ingredienteActivoId: resolveIngredientId(
      row.tipoProductoId ?? "",
      row.ingredienteActivoNombre ?? "",
      row.marcaProductoNombre ?? "",
      ingredientCatalog,
      commercialCatalog
    ),
    ingredienteActivoNombre: row.ingredienteActivoNombre ?? "",
    dosisProducto: row.dosisProducto?.toString() ?? "",
    unidadDosis: row.unidadDosis ?? "",
    marcaProductoNombre: row.marcaProductoNombre ?? "",
    concentracionProducto:
      catalogProduct?.concentracionTexto ??
      catalogProduct?.concentracion?.toString() ??
      row.concentracionProducto?.toString() ??
      "",
    unidadMedidaProducto: catalogProduct?.unidadMedida ?? "",
    cantidadTotalProducto: formatCalculatedField(row.cantidadTotalProducto)
  };
}

function normalizeFertilizacionUnidadDosis(
  value: string | null | undefined,
  viaAplicacion: AppFertilizacion["viaAplicacion"]
) {
  const unit = getDosisUnit(value);
  return unit ? buildFertilizacionUnidadDosis(unit, viaAplicacion) : "";
}

function factorToGrade(factor: number) {
  if (factor >= 1.5) return 3;
  if (factor >= 1.2) return 2;
  return 1;
}

function uniqueNames(names: string[]) {
  const unique = new Map<string, string>();
  for (const name of names) {
    const normalized = normalizeName(name);
    if (normalized && !unique.has(normalized)) unique.set(normalized, name.trim());
  }
  return [...unique.values()];
}

function formatCalculatedField(value: string | number | null | undefined) {
  const parsed = parsePositiveDecimal(value);
  return parsed ? parsed.toFixed(2) : "";
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function toPositiveInteger(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/gu, " ");
}

function createTransientId(prefix: string) {
  transientIdSequence += 1;
  return `${prefix}_${Date.now()}_${transientIdSequence}`;
}
