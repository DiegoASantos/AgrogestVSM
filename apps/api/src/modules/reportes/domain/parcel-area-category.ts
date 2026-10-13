export const PARCEL_AREA_CATEGORIES = [
  { code: "MICRO", name: "Micro" },
  { code: "PEQUENO", name: "Pequeño" },
  { code: "MEDIANO", name: "Mediano" },
  { code: "GRANDE", name: "Grande" }
] as const;

export type ParcelAreaCategoryCode = (typeof PARCEL_AREA_CATEGORIES)[number]["code"];

export function classifyParcelArea(area: number): ParcelAreaCategoryCode | null {
  if (!Number.isFinite(area) || area <= 0) return null;
  if (area < 4) return "MICRO";
  if (area < 7) return "PEQUENO";
  if (area < 10) return "MEDIANO";
  return "GRANDE";
}

export function normalizePositiveArea(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const area = Number(value);
  return Number.isFinite(area) && area > 0 ? area : null;
}

export function getParcelAreaCategoryName(area: number | null): string {
  if (area === null) return "Sin categoría";
  const code = classifyParcelArea(area);
  return PARCEL_AREA_CATEGORIES.find((category) => category.code === code)?.name ?? "Sin categoría";
}
