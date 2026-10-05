import type { EtapaFenologicaCatalogItem, SubEtapaCatalogItem } from "../types";
import type { VisitPhenologicalStage } from "../types/visita-campo.types";

export function resolveSubEtapaIdForCoverage(
  subEtapas: SubEtapaCatalogItem[],
  coveragePercentage: number
): string | null {
  if (
    !Number.isInteger(coveragePercentage) ||
    coveragePercentage < 1 ||
    coveragePercentage > 100
  ) {
    return null;
  }

  const configuredSubEtapas = subEtapas
    .filter(
      (item) =>
        item.percentage !== null &&
        Number.isFinite(item.percentage) &&
        item.percentage >= 0 &&
        item.percentage <= 100
    )
    .sort(
      (left, right) =>
        left.percentage! - right.percentage! ||
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id)
    );

  if (configuredSubEtapas.length === 0) {
    return null;
  }

  const match = configuredSubEtapas.find(
    (item) => coveragePercentage <= item.percentage!
  );
  return (match ?? configuredSubEtapas[configuredSubEtapas.length - 1])?.id ?? null;
}

export function validateStageDistribution(
  entries: VisitPhenologicalStage[],
  catalog: EtapaFenologicaCatalogItem[]
): string | null {
  if (
    entries.some(
      (entry) =>
        !entry.phenologicalStageId ||
        !catalog.some((item) => item.id === entry.phenologicalStageId)
    )
  ) {
    return "Selecciona al menos una etapa o labor válida.";
  }
  if (
    new Set(entries.map((entry) => entry.phenologicalStageId)).size !== entries.length
  ) {
    return "Cada etapa o labor puede registrarse una sola vez.";
  }
  let total = 0;
  for (const entry of entries) {
    const stage = catalog.find((item) => item.id === entry.phenologicalStageId)!;
    if (
      !Number.isInteger(entry.coveragePercentage) ||
      entry.coveragePercentage! < 1 ||
      entry.coveragePercentage! > 100
    ) {
      return `Ingresa un porcentaje de parcela válido para ${stage.name}.`;
    }
    total += entry.coveragePercentage!;
    if (stage.type === "Etapa" && !entry.subEtapaId) {
      return `No se pudo asignar automáticamente la subetapa de ${stage.name} con el porcentaje indicado.`;
    }
  }
  return total !== 100
    ? `La distribución de la parcela debe sumar 100%; ahora suma ${total}%.`
    : null;
}
