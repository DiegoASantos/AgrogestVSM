import { parsePositiveDecimal, type AppMezcla } from "./visita-receta-multiple-products";

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
};

export function mixtureStatus(mixture: EditableMixture, options: ProductOption[]) {
  if (mixture.assignments.length === 0) return "Sin configurar";
  const completeDose = mixture.assignments.every(
    (item) => Boolean(parsePositiveDecimal(item.dose)) && Boolean(item.unit)
  );
  const completePlants = mixture.assignments.every((item) => {
    const option = options.find((product) => product.ref === item.productRef);
    return (
      option?.viaAplicacion !== "edafica" || Boolean(parsePositiveDecimal(item.plants))
    );
  });
  const completeVolume =
    !requiresVolume(mixture, options) ||
    Boolean(parsePositiveDecimal(mixture.volumenAplicacion));
  const completeCoadjuvants = mixture.coadyuvantesIds.every((id) =>
    Boolean(mixture.coadyuvantesDosis?.[id]?.trim())
  );
  const frequency = (mixture.frecuenciaDosis ?? "").trim();
  const completeFrequency = frequency.length > 0 && frequency.length <= 200;
  return completeDose &&
    completePlants &&
    completeVolume &&
    completeCoadjuvants &&
    completeFrequency
    ? "Lista"
    : "En progreso";
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
  const incomplete = mixtures.find((item) => mixtureStatus(item, options) !== "Lista");
  if (incomplete) return `Completa los datos de la mezcla ${incomplete.numero}.`;
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

export function shouldShowMixtureNavigation(mixtureCount: number) {
  return mixtureCount > 1;
}
