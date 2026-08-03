import type { SaveRecetaData } from "../../services";
import type {
  CoadyuvanteCatalogItem,
  FertilizanteCatalogItem,
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  RecetaFitosanidad,
  RecetaFertilizacion
} from "../../types";
import { resolveIngredientId } from "./visita-receta-selection";

export type AppIngrediente = {
  localId: string;
  tipoProductoId: string;
  modoAccionId: string;
  ingredienteActivoId: string;
  ingredienteActivoNombre: string;
  dosisIa: string;
  cantidadTotalIa: string;
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
  tipoControlId: string;
  disolvente: string;
  volumenAplicacion: string;
  coadyuvantesIds: string[];
  ordenMezcla: string[];
  ingredientes: AppIngrediente[];
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
  cantidadTotalFertilizante: string;
};

let transientIdSequence = 0;

export function createEmptyIngrediente(): AppIngrediente {
  return {
    localId: createTransientId("ingrediente"),
    tipoProductoId: "",
    modoAccionId: "",
    ingredienteActivoId: "",
    ingredienteActivoNombre: "",
    dosisIa: "",
    cantidadTotalIa: "",
    marcaProductoNombre: "",
    concentracionProducto: "",
    unidadMedidaProducto: "",
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
    cantidadTotalFertilizante: ""
  };
}

export function restoreFitosanidadApps(
  rows: RecetaFitosanidad[],
  ingredientCatalog: IngredienteActivoCatalogItem[],
  commercialCatalog: MarcaProductoCatalogItem[]
): AppFitosanidad[] {
  const groups = new Map<string, AppFitosanidad>();

  for (const row of rows) {
    const key = [row.numero, row.objetivo, normalizeName(row.objetivoNombre)].join("::");
    const ingredient = restoreIngrediente(row, ingredientCatalog, commercialCatalog);
    const existing = groups.get(key);

    if (existing) {
      existing.ingredientes.push(ingredient);
      continue;
    }

    groups.set(key, {
      localId: `fito_${row.id}`,
      numero: row.numero,
      objetivo: row.objetivo,
      objetivoNombre: row.objetivoNombre,
      tipoControlId: row.tipoControlId ?? "",
      disolvente: row.disolvente,
      volumenAplicacion: row.volumenAplicacion?.toString() ?? "",
      coadyuvantesIds: parseJsonArray(row.coadyuvantesIds),
      ordenMezcla: parseJsonArray(row.ordenMezcla),
      ingredientes: [ingredient]
    });
  }

  return Array.from(groups.values());
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
      cantidadTotalFertilizante: formatCalculatedField(row.cantidadTotalFertilizante)
    };
  });
}

export function buildFitosanidadForSave(
  applications: AppFitosanidad[],
  areaHectares: number | null
): SaveRecetaData["fitosanidad"] {
  return applications.flatMap((application) =>
    application.ingredientes.map((ingredient) => {
      const totalIa = calculateTotalIa(
        ingredient.dosisIa,
        application.volumenAplicacion,
        areaHectares
      );
      const totalProducto = calculateTotalProducto(
        totalIa,
        ingredient.concentracionProducto
      );

      return {
        numero: application.numero,
        objetivo: application.objetivo,
        objetivoNombre: application.objetivoNombre,
        tipoControlId: application.tipoControlId || null,
        tipoProductoId: ingredient.tipoProductoId || null,
        disolvente: application.disolvente,
        modoAccionId: ingredient.modoAccionId || null,
        ingredienteActivoNombre: ingredient.ingredienteActivoNombre || null,
        dosisIa: parsePositiveDecimal(ingredient.dosisIa),
        volumenAplicacion: parsePositiveDecimal(application.volumenAplicacion),
        cantidadTotalIa: totalIa || null,
        marcaProductoNombre: ingredient.marcaProductoNombre || null,
        concentracionProducto: parsePositiveDecimal(ingredient.concentracionProducto),
        cantidadTotalProducto: totalProducto || null,
        coadyuvantesIds:
          application.coadyuvantesIds.length > 0
            ? JSON.stringify(application.coadyuvantesIds)
            : null,
        ordenMezcla:
          application.ordenMezcla.length > 0
            ? JSON.stringify(application.ordenMezcla)
            : null
      };
    })
  );
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
    cantidadTotalFertilizante: parsePositiveDecimal(
      fertilizacion.cantidadTotalFertilizante
    )
  }));
}

export function collectNomenclaturaMezcla(
  applications: AppFitosanidad[],
  fertilizaciones: AppFertilizacion[],
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  const coadyuvanteById = new Map(coadyuvantes.map((item) => [item.id, item.name]));
  const names = [
    ...applications.flatMap((application) => [
      ...application.ingredientes.flatMap((ingredient) => [
        ingredient.ingredienteActivoNombre,
        ingredient.marcaProductoNombre
      ]),
      ...application.coadyuvantesIds.map((id) => coadyuvanteById.get(id) ?? "")
    ]),
    ...fertilizaciones.map((fertilizacion) => fertilizacion.fertilizanteNombre)
  ];
  const unique = new Map<string, string>();

  for (const name of names) {
    const normalized = normalizeName(name);
    if (normalized && !unique.has(normalized)) {
      unique.set(normalized, name.trim());
    }
  }

  return Array.from(unique.values());
}

export function recalculateIngrediente(
  ingredient: AppIngrediente,
  volumenAplicacion: string,
  areaHectares: number | null
): AppIngrediente {
  const totalIa = calculateTotalIa(ingredient.dosisIa, volumenAplicacion, areaHectares);
  const totalProducto = calculateTotalProducto(totalIa, ingredient.concentracionProducto);

  return {
    ...ingredient,
    cantidadTotalIa: totalIa ? totalIa.toFixed(2) : "",
    cantidadTotalProducto: totalProducto ? totalProducto.toFixed(2) : ""
  };
}

export function recalculateFertilizacion(
  fertilizacion: AppFertilizacion
): AppFertilizacion {
  const dosis = parsePositiveDecimal(fertilizacion.dosis) ?? 0;
  const factor =
    fertilizacion.viaAplicacion === "edafica"
      ? (parsePositiveDecimal(fertilizacion.cantidadTotalPlantas) ?? 0)
      : (parsePositiveDecimal(fertilizacion.volumenAplicacion) ?? 0);

  return {
    ...fertilizacion,
    cantidadTotalFertilizante: dosis && factor ? (dosis * factor).toFixed(4) : ""
  };
}

export function hasFitosanidadData(applications: AppFitosanidad[]) {
  return applications.some(
    (application) =>
      Boolean(
        application.tipoControlId ||
        application.disolvente.trim() !== "Agua" ||
        application.volumenAplicacion.trim() ||
        application.coadyuvantesIds.length ||
        application.ordenMezcla.length
      ) ||
      application.ingredientes.some((ingredient) =>
        Boolean(
          ingredient.tipoProductoId ||
          ingredient.modoAccionId ||
          ingredient.ingredienteActivoNombre.trim() ||
          ingredient.dosisIa.trim() ||
          ingredient.marcaProductoNombre.trim() ||
          ingredient.concentracionProducto.trim()
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
      fertilizacion.volumenAplicacion.trim() ||
      fertilizacion.cantidadTotalFertilizante.trim()
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

export function calculateTotalIa(
  dosisIa: string | number | null | undefined,
  volumenAplicacion: string | number | null | undefined,
  areaHectares: number | null
) {
  const dosis = parsePositiveDecimal(dosisIa);
  const volumen = parsePositiveDecimal(volumenAplicacion);
  const area = areaHectares ?? 1;

  return dosis && volumen ? dosis * volumen * area : 0;
}

export function calculateTotalProducto(
  cantidadTotalIa: string | number | null | undefined,
  concentracionProducto: string | number | null | undefined
) {
  const totalIa = parsePositiveDecimal(cantidadTotalIa);
  const concentracion = parsePositiveDecimal(concentracionProducto);

  return totalIa && concentracion ? totalIa / concentracion : 0;
}

export function getUnidadDosis(fertilizacion: AppFertilizacion) {
  if (fertilizacion.viaAplicacion === "edafica") {
    return fertilizacion.tipoProducto === "liquido" ? "L/planta" : "Kg/planta";
  }
  return fertilizacion.tipoProducto === "liquido" ? "L/cilindro" : "Kg/cilindro";
}

function restoreIngrediente(
  row: RecetaFitosanidad,
  ingredientCatalog: IngredienteActivoCatalogItem[],
  commercialCatalog: MarcaProductoCatalogItem[]
): AppIngrediente {
  const catalogProduct = commercialCatalog.find(
    (product) =>
      normalizeName(product.name) === normalizeName(row.marcaProductoNombre ?? "")
  );

  return {
    localId: `ingrediente_${row.id}`,
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
    dosisIa: row.dosisIa?.toString() ?? "",
    cantidadTotalIa: formatCalculatedField(row.cantidadTotalIa),
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
