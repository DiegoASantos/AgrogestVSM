type ExistingSanitaryObservation = {
  id: string;
  pestDiseaseId: string;
};

export function getSanitaryObservationIdsToDelete(
  existingObservations: ExistingSanitaryObservation[],
  activePestDiseaseIds: ReadonlySet<string>,
  selectedPestDiseaseIds: ReadonlySet<string>
) {
  return existingObservations
    .filter(
      (observation) =>
        activePestDiseaseIds.has(observation.pestDiseaseId) &&
        !selectedPestDiseaseIds.has(observation.pestDiseaseId)
    )
    .map((observation) => observation.id);
}
