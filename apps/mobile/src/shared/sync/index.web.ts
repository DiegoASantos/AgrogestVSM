export { useSync } from "./use-sync.web";
export { getSyncCounts, getSyncErrorDetails, getLastSyncTime } from "./sync-status.web";

export async function processOutbox() {
  return {
    processed: 0,
    skipped: 0,
    errors: 0
  };
}
