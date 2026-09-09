import { parsePositiveDecimal, type AppMezcla } from "./visita-receta-multiple-products";
import type {
  FertilizanteCatalogItem,
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  TipoProductoFitosanitarioCatalogItem
} from "../../types";

export type ProductKind = "fitosanitario" | "fertilizante";

export type MixtureAssignment = {
  productRef: string;
  kind: ProductKind;
  dose: string;
  unit: string;
  plants: string;
};

export type EditableMixture = AppMezcla & {
  assignments: MixtureAssignment[];
};

export type ProductOption = {
  ref: string;
  kind: ProductKind;
  label: string;
  subtitle: string;
  dose: string;
  unit: string;
  plants: string;
  viaAplicacion: "edafica" | "foliar" | null;
  origin?: "recomendacion" | "mezcla_directa";
  productType?: "solido" | "liquido" | null;
};

export type MixtureIssueSection = "products" | "application" | "coadyuvants";

export type MixtureIssue = {
  id: string;
  section: MixtureIssueSection;
  message: string;
};

export type DirectProductCatalogOption =
  | {
      key: string;
      kind: "fitosanitario";
      label: string;
      helper: string;
      brand: MarcaProductoCatalogItem;
      ingredientName: string;
    }
  | {
      key: string;
      kind: "fertilizante";
      label: string;
      helper: string;
      fertilizer: FertilizanteCatalogItem;
    };

export function buildDirectProductCatalog(
  brands: MarcaProductoCatalogItem[],
  ingredients: IngredienteActivoCatalogItem[],
  productTypes: TipoProductoFitosanitarioCatalogItem[],
  fertilizers: FertilizanteCatalogItem[]
): DirectProductCatalogOption[] {
  const ingredientById = new Map(ingredients.map((item) => [item.id, item.name]));
  const typeById = new Map(productTypes.map((item) => [item.id, item.name]));
  const fitosanitaryOptions: DirectProductCatalogOption[] = brands.map((brand) => {
    const ingredientName =
      (brand.ingredienteActivoId
        ? ingredientById.get(brand.ingredienteActivoId)
        : undefined) ??
      brand.ingredienteActivoNombre ??
      "Ingrediente no especificado";
    const typeName = brand.tipoProductoId
      ? typeById.get(brand.tipoProductoId)
      : undefined;
    return {
      key: `fitosanitario:${brand.id}`,
      kind: "fitosanitario",
      label: brand.name,
      helper: ["Fitosanitario", ingredientName, typeName].filter(Boolean).join(" · "),
      brand,
      ingredientName
    };
  });
  const fertilizerOptions: DirectProductCatalogOption[] = fertilizers.map(
    (fertilizer) => ({
      key: `fertilizante:${fertilizer.id}`,
      kind: "fertilizante",
      label: fertilizer.name,
      helper: `Fertilizante · ${fertilizer.type === "liquido" ? "Liquido" : "Solido"}`,
      fertilizer
    })
  );

  return [...fitosanitaryOptions, ...fertilizerOptions].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  );
}

export function getDirectDoseUnits(option: ProductOption) {
  if (option.kind === "fitosanitario" || option.productType === "liquido") {
    return option.kind === "fitosanitario"
      ? ["mg/cilindro", "g/cilindro", "kg/cilindro", "ml/cilindro", "l/cilindro"]
      : ["ml/cilindro", "l/cilindro"];
  }
  return ["mg/cilindro", "g/cilindro", "kg/cilindro"];
}

export function mixtureStatus(mixture: EditableMixture, options: ProductOption[]) {
  if (mixture.assignments.length === 0) return "Sin configurar";
  return getMixtureIssues(mixture, options).length === 0 ? "Lista" : "En progreso";
}

export function getMixtureIssues(
  mixture: EditableMixture,
  options: ProductOption[]
): MixtureIssue[] {
  if (mixture.assignments.length === 0) {
    return [
      {
        id: "products",
        section: "products",
        message: "Agrega al menos un producto a esta mezcla."
      }
    ];
  }

  const issues: MixtureIssue[] = [];
  for (const assignment of mixture.assignments) {
    const option = options.find((product) => product.ref === assignment.productRef);
    const productLabel = option?.label ?? "el producto";
    if (!parsePositiveDecimal(assignment.dose)) {
      issues.push({
        id: `product:${assignment.productRef}:dose`,
        section: "products",
        message: `Ingresa una dosis mayor a cero para ${productLabel}.`
      });
    }
    if (!assignment.unit.trim()) {
      issues.push({
        id: `product:${assignment.productRef}:unit`,
        section: "products",
        message:
          option?.origin === "mezcla_directa"
            ? `Selecciona la unidad de dosis para ${productLabel}.`
            : `Vuelve a Receta y selecciona la unidad de dosis para ${productLabel}.`
      });
    }
    if (option?.viaAplicacion === "edafica" && !parsePositiveDecimal(assignment.plants)) {
      issues.push({
        id: `product:${assignment.productRef}:plants`,
        section: "products",
        message: `Ingresa la cantidad de plantas para ${productLabel}.`
      });
    }
  }

  if (
    requiresVolume(mixture, options) &&
    !parsePositiveDecimal(mixture.volumenAplicacion)
  ) {
    issues.push({
      id: "application:volume",
      section: "application",
      message: "Ingresa un volumen de aplicación mayor a cero."
    });
  }

  const frequency = (mixture.frecuenciaDosis ?? "").trim();
  if (!frequency) {
    issues.push({
      id: "application:frequency",
      section: "application",
      message: "Indica cada cuánto se aplicará la mezcla."
    });
  } else if (frequency.length > 200) {
    issues.push({
      id: "application:frequency",
      section: "application",
      message: "La frecuencia debe tener como máximo 200 caracteres."
    });
  }

  for (const id of mixture.coadyuvantesIds) {
    if (!mixture.coadyuvantesDosis?.[id]?.trim()) {
      issues.push({
        id: `coadyuvant:${id}:dose`,
        section: "coadyuvants",
        message: "Completa la dosis y unidad del coadyuvante seleccionado."
      });
    }
  }

  return issues;
}

export function requiresVolume(mixture: EditableMixture, options: ProductOption[]) {
  return mixture.assignments.some((assignment) => {
    const option = options.find((item) => item.ref === assignment.productRef);
    return option?.kind === "fitosanitario" || option?.viaAplicacion === "foliar";
  });
}

export function validateMixtures(
  mixtures: EditableMixture[],
  options: ProductOption[],
  assignedRefs: Set<string>
) {
  if (options.length === 0) return null;
  if (mixtures.length < 1 || mixtures.length > 20) {
    return "La cantidad de mezclas debe estar entre 1 y 20.";
  }
  const unassigned = options.find((item) => !assignedRefs.has(item.ref));
  if (unassigned) return `Asigna ${unassigned.label} al menos a una mezcla.`;
  const empty = mixtures.find((item) => item.assignments.length === 0);
  if (empty) return `La mezcla ${empty.numero} no puede quedar vacia.`;
  for (const mixture of mixtures) {
    const issue = getMixtureIssues(mixture, options)[0];
    if (issue) return `Mezcla ${mixture.numero}: ${issue.message}`;
  }
  return null;
}

export function findFirstMixtureIssue(
  mixtures: EditableMixture[],
  options: ProductOption[],
  assignedRefs: Set<string>
): { mixtureNumber: number; issue: MixtureIssue } | null {
  const unassigned = options.find((item) => !assignedRefs.has(item.ref));
  if (unassigned) {
    return {
      mixtureNumber: mixtures[0]?.numero ?? 1,
      issue: {
        id: `unassigned:${unassigned.ref}`,
        section: "products",
        message: `Asigna ${unassigned.label} al menos a una mezcla.`
      }
    };
  }

  for (const mixture of mixtures) {
    const issue = getMixtureIssues(mixture, options)[0];
    if (issue) return { mixtureNumber: mixture.numero, issue };
  }
  return null;
}

export function copyMixtureConfiguration(source: EditableMixture) {
  return {
    frecuenciaDosis: source.frecuenciaDosis ?? "",
    volumenAplicacion: source.volumenAplicacion,
    coadyuvantesIds: [...source.coadyuvantesIds],
    coadyuvantesDosis: { ...(source.coadyuvantesDosis ?? {}) },
    ordenMezcla: [...source.ordenMezcla],
    factor: source.factor,
    factorEditable: source.factorEditable,
    cantidadTotalProducto: source.cantidadTotalProducto,
    assignments: source.assignments.map((item) => ({ ...item }))
  };
}

export function parseMixtureCount(raw: string) {
  if (!raw.trim()) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(20, parsed));
}

export function getSteppedMixtureCount(
  raw: string,
  currentCount: number,
  direction: -1 | 1
) {
  const baseCount = parseMixtureCount(raw) ?? currentCount;
  return Math.max(1, Math.min(20, baseCount + direction));
}

export function findNextIncompleteMixtureNumber(
  mixtures: EditableMixture[],
  options: ProductOption[],
  activeNumber: number
) {
  const incomplete = mixtures.filter(
    (mixture) =>
      mixture.numero !== activeNumber && mixtureStatus(mixture, options) !== "Lista"
  );
  return (
    incomplete.find((mixture) => mixture.numero > activeNumber)?.numero ??
    incomplete[0]?.numero ??
    null
  );
}

export function shouldShowMixtureNavigation(mixtureCount: number) {
  return mixtureCount > 1;
}
