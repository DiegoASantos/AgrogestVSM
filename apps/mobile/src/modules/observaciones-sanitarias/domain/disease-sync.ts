type SanitaryObservationSyncState = {
  pestDiseaseId: string;
  syncStatus: "pending" | "synced" | "error";
};

export function hasUnsyncedDiseaseObservation(
  observations: SanitaryObservationSyncState[],
  diseaseIds: ReadonlySet<string>
) {
  return observations.some(
    (item) => diseaseIds.has(item.pestDiseaseId) && item.syncStatus !== "synced"
  );
}
