type FitosanidadDose = {
  dosisProducto?: number | null;
  unidadDosis?: string | null;
  cantidadTotalProducto?: number | null;
};

type FertilizacionDose = {
  dosis?: number | null;
  unidadDosis?: string | null;
};

export function getDoseUnit(value: string | null | undefined) {
  return value?.split("/")[0]?.trim().toLowerCase() ?? "";
}

export function formatDoseUnit(
  value: string | null | undefined,
  denominator: "cilindro" | "ha"
) {
  const unit = getDoseUnit(value);
  return unit ? `${unit}/${denominator}` : `mg o ml/${denominator}`;
}

export function getFitosanidadAggregateUnit(
  values: Array<string | null | undefined>
) {
  const units = values.map(getDoseUnit);
  if (units.every((unit) => !unit)) return "mg o ml/ha";

  const distinctUnits = new Set(units);
  return distinctUnits.size === 1 ? `${units[0]}/ha` : "";
}

export function getFertilizacionTotalUnit(
  value: string | null | undefined,
  tipoProducto: "solido" | "liquido" | null | undefined
) {
  return getDoseUnit(value) || (tipoProducto === "liquido" ? "l" : "kg");
}

export function formatFitosanidadDosis(item: FitosanidadDose) {
  if (item.cantidadTotalProducto !== null && item.cantidadTotalProducto !== undefined) {
    return `${item.cantidadTotalProducto} ${formatDoseUnit(item.unidadDosis, "ha")}`;
  }

  if (item.dosisProducto !== null && item.dosisProducto !== undefined) {
    return `${item.dosisProducto} ${formatDoseUnit(item.unidadDosis, "cilindro")}`;
  }

  return "-";
}

export function formatFertilizacionDosis(item: FertilizacionDose) {
  const parts = [item.dosis, item.unidadDosis].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "-";
}
