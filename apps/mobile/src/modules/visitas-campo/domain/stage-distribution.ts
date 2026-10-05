import type { EtapaFenologicaCatalogItem } from "../types";
import type { VisitPhenologicalStage } from "../types/visita-campo.types";

export function validateStageDistribution(
  entries: VisitPhenologicalStage[],
  catalog: EtapaFenologicaCatalogItem[]
): string | null {
  if (entries.some((entry) => !entry.phenologicalStageId ||
      !catalog.some((item) => item.id === entry.phenologicalStageId))) {
    return "Selecciona al menos una etapa o labor válida.";
  }
  if (new Set(entries.map((entry) => entry.phenologicalStageId)).size !== entries.length) {
    return "Cada etapa o labor puede registrarse una sola vez.";
  }
  let total = 0;
  for (const entry of entries) {
    const stage = catalog.find((item) => item.id === entry.phenologicalStageId)!;
    if (!Number.isInteger(entry.coveragePercentage) ||
        entry.coveragePercentage! < 1 || entry.coveragePercentage! > 100) {
      return `Ingresa un porcentaje de parcela válido para ${stage.name}.`;
    }
    total += entry.coveragePercentage!;
    if (stage.type === "Etapa" && !entry.subEtapaId) {
      return `Selecciona la subetapa de ${stage.name}.`;
    }
  }
  return total !== 100
    ? `La distribución de la parcela debe sumar 100%; ahora suma ${total}%.` : null;
}
