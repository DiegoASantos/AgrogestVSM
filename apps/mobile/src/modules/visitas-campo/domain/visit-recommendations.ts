export function hasVisitRecommendations(input: {
  fitosanidad: boolean;
  fertilizacion: boolean;
  riego: boolean;
  labores: boolean;
}) {
  return Object.values(input).some(Boolean);
}
