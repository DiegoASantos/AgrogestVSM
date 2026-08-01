export function resolveDiseaseIncidenceGrade(percentage: number) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError(
      "El porcentaje de árboles enfermos debe ser un entero entre 0 y 100."
    );
  }
  if (percentage === 0) return 0;
  if (percentage <= 5) return 1;
  if (percentage <= 20) return 2;
  return 3;
}

export function resolveDiseaseIncidenceDescription(grade: number) {
  return (
    {
      0: "0% de árboles enfermos.",
      1: "Más de 0% y hasta 5% de árboles enfermos.",
      2: "Más de 5% y hasta 20% de árboles enfermos.",
      3: "Más de 20% y hasta 100% de árboles enfermos."
    }[grade] ?? null
  );
}
