export function validateRequiredPhenologicalStage(value: string) {
  return value.trim() ? undefined : "Selecciona una etapa fenologica.";
}
