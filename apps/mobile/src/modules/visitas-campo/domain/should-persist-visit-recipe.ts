export function shouldPersistVisitRecipe(
  hasRecommendations: boolean,
  hasExistingRecipe: boolean
) {
  return hasRecommendations || hasExistingRecipe;
}
