export function resolveNutritionIncidenceGrade(percentage: number) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError(
      "El porcentaje de árboles afectados debe ser un entero entre 0 y 100."
    );
  }
  if (percentage === 0) return 0;
  if (percentage <= 5) return 1;
  if (percentage <= 20) return 2;
  return 3;
}
