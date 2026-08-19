import type { ConsolidacionHallazgo } from "../../types";

export function buildConsolidacionSummary(data: ConsolidacionHallazgo) {
  const parts = [
    formatCount(data.plagas.length, "plaga", "plagas"),
    formatCount(data.enfermedades.length, "enfermedad", "enfermedades"),
    formatCount(data.nutricion.length, "deficiencia", "deficiencias"),
    formatCount(data.labores.length, "labor", "labores")
  ].filter(Boolean);

  const findings = parts.length > 0 ? parts.join(" · ") : "Sin hallazgos positivos";
  return data.etapaFenologica ? `${data.etapaFenologica} · ${findings}` : findings;
}

export function buildOptionalRecipeSectionStatus(hasSelection: boolean) {
  return hasSelection
    ? ({ label: "Registrado", tone: "success" } as const)
    : ({ label: "Sin registros", tone: "warning" } as const);
}

export function buildRiegoSummary(selectedLabel: string | null) {
  return selectedLabel
    ? `Seleccionado: ${selectedLabel}`
    : "Sin recomendacion seleccionada · Opcional";
}

export function buildLaboresSummary(selectionCount: number) {
  if (selectionCount === 0) {
    return "Sin recomendaciones seleccionadas · Opcional";
  }

  return selectionCount === 1
    ? "1 recomendacion seleccionada"
    : `${selectionCount} recomendaciones seleccionadas`;
}

function formatCount(count: number, singular: string, plural: string) {
  if (count === 0) return "";
  return `${count} ${count === 1 ? singular : plural}`;
}
