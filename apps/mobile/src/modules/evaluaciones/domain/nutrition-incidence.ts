export type NutritionIncidence = {
  grade: 0 | 1 | 2 | 3;
  description: string;
};

export function resolveNutritionIncidence(
  affectedTreePercentage: number
): NutritionIncidence {
  if (!Number.isInteger(affectedTreePercentage)) {
    throw new Error("El porcentaje de árboles afectados debe ser un entero.");
  }
  if (affectedTreePercentage < 0 || affectedTreePercentage > 100) {
    throw new Error("El porcentaje de árboles afectados debe estar entre 0 y 100.");
  }
  if (affectedTreePercentage === 0) {
    return { grade: 0, description: "Sin árboles afectados (0%)." };
  }
  if (affectedTreePercentage <= 5) {
    return { grade: 1, description: "Más de 0% y hasta 5% de árboles afectados." };
  }
  if (affectedTreePercentage <= 20) {
    return { grade: 2, description: "Más de 5% y hasta 20% de árboles afectados." };
  }
  return { grade: 3, description: "Más de 20% de árboles afectados." };
}
