import { resolveNutritionIncidence } from "../../../evaluaciones/domain/nutrition-incidence";
import { resolveDiseaseIncidenceGrade } from "../../../observaciones-sanitarias/domain/disease-incidence";
import type { SaveRecetaData } from "../../services";
import type {
  CoadyuvanteCatalogItem,
  FertilizanteCatalogItem,
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  RecetaFertilizacion,
  RecetaMezcla
} from "../../types";
import { resolveIngredientId } from "./visita-receta-selection";

export type AppIngrediente = {
  localId: string;
  mezclaNumero: number;
  tipoProductoId: string;
  modoAccionId: string;
  ingredienteActivoId: string;
  ingredienteActivoNombre: string;
  dosisProducto: string;
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
  incidenceGrade: number;
  tipoControlId: string;
  disolvente: string;
  ingredientes: AppIngrediente[];
};

export type AppMezcla = {
  localId: string;
  numero: number;
  volumenAplicacion: string;
  coadyuvantesIds: string[];
  ordenMezcla: string[];
  factor: string;
  factorEditable: boolean;
  cantidadTotalProducto: string;
};

export type AppFertilizacion = {
  localId: string;
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
    volumenAplicacion,
    coadyuvantesIds: [],
    ordenMezcla: [],
    factor: "1",
    factorEditable: false,
    cantidadTotalProducto: ""
  };
}

export function createEmptyFertilizacion(volumenAplicacion = ""): AppFertilizacion {
  return {
    localId: createTransientId("fertilizante"),
    viaAplicacion: "edafica",
    fertilizanteNombre: "",
    tipoProducto: "solido",
    concentracion: "",
    unidadMedida: "",
    dosis: "",
    unidadDosis: "",
    cantidadTotalPlantas: "",
    volumenAplicacion,
    factor: "1",
    factorEditable: false,
    cantidadTotalFertilizante: ""
  };
}

export function restoreFitosanidadApps(
  mezclas: RecetaMezcla[],
  ingredientCatalog: IngredienteActivoCatalogItem[],
  commercialCatalog: MarcaProductoCatalogItem[]
): AppFitosanidad[] {
  const groups = new Map<string, AppFitosanidad>();

  for (const mezcla of mezclas) {
    for (const row of mezcla.productos) {
      const key = [row.objetivo, normalizeName(row.objetivoNombre)].join("::");
      const ingredient = restoreIngrediente(
        row,
        mezcla.numero,
        ingredientCatalog,
        commercialCatalog
      );
      const existing = groups.get(key);

      if (existing) {
        existing.ingredientes.push(ingredient);
      } else {
        groups.set(key, {
          localId: `fito_${row.id}`,
          numero: groups.size + 1,
          objetivo: row.objetivo,
          objetivoNombre: row.objetivoNombre,
          incidenceGrade: factorToGrade(mezcla.factor),
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
    volumenAplicacion: row.volumenAplicacion?.toString() ?? "",
    coadyuvantesIds: parseJsonArray(row.coadyuvantesIds),
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
  return rows.map((row) => {
    const catalogProduct = fertilizerCatalog.find(
      (product) =>
        normalizeName(product.name) === normalizeName(row.fertilizanteNombre ?? "")
    );

    return {
      localId: `fertilizante_${row.id}`,
      viaAplicacion: row.viaAplicacion,
      fertilizanteNombre: row.fertilizanteNombre ?? "",
      tipoProducto: row.tipoProducto ?? "solido",
      concentracion: catalogProduct?.concentracion ?? "",
      unidadMedida: catalogProduct?.unidadMedida ?? "",
      dosis: row.dosis?.toString() ?? "",
      unidadDosis: row.unidadDosis ?? "",
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
          objetivo: application.objetivo,
          objetivoNombre: application.objetivoNombre,
          tipoControlId: application.tipoControlId || null,
          tipoProductoId: ingredient.tipoProductoId || null,
          disolvente: application.disolvente,
          modoAccionId: ingredient.modoAccionId || null,
          ingredienteActivoNombre: ingredient.ingredienteActivoNombre || null,
          dosisProducto: parsePositiveDecimal(ingredient.dosisProducto),
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
      coadyuvantesIds:
        mezcla.coadyuvantesIds.length > 0 ? JSON.stringify(mezcla.coadyuvantesIds) : null,
      ordenMezcla:
        mezcla.ordenMezcla.length > 0 ? JSON.stringify(mezcla.ordenMezcla) : null,
      volumenAplicacion: parsePositiveDecimal(mezcla.volumenAplicacion),
      factor: parsePositiveDecimal(mezcla.factor) ?? 1,
      factorEditable: mezcla.factorEditable,
      cantidadTotalProducto: productos.reduce((sum, p) => sum + (p.cantidadTotalProducto ?? 0), 0) || null,
      productos
    };
  });
}

export function buildFertilizacionesForSave(
  fertilizaciones: AppFertilizacion[]
): SaveRecetaData["fertilizacion"] {
  return fertilizaciones.map((fertilizacion) => ({
    viaAplicacion: fertilizacion.viaAplicacion,
    fertilizanteNombre: fertilizacion.fertilizanteNombre || null,
    tipoProducto: fertilizacion.tipoProducto,
    dosis: parsePositiveDecimal(fertilizacion.dosis),
    unidadDosis: fertilizacion.unidadDosis || getUnidadDosis(fertilizacion),
    cantidadTotalPlantas: toPositiveInteger(fertilizacion.cantidadTotalPlantas),
    volumenAplicacion: parsePositiveDecimal(fertilizacion.volumenAplicacion),
    factor: parsePositiveDecimal(fertilizacion.factor) ?? 1,
    cantidadTotalFertilizante: parsePositiveDecimal(
      fertilizacion.cantidadTotalFertilizante
    )
  }));
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
  return applications.some((application) =>
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
  return fertilizaciones.some((fertilizacion) =>
    Boolean(
      fertilizacion.fertilizanteNombre.trim() ||
      fertilizacion.dosis.trim() ||
      fertilizacion.cantidadTotalPlantas.trim() ||
      fertilizacion.volumenAplicacion.trim()
    )
  );
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
  if (fertilizacion.viaAplicacion === "edafica") {
    return fertilizacion.tipoProducto === "liquido" ? "L/planta" : "Kg/planta";
  }
  return fertilizacion.tipoProducto === "liquido" ? "L/cilindro" : "Kg/cilindro";
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
    localId: `ingrediente_${row.id}`,
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
