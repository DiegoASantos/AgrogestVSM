export function getSyncCounts() {
  return {
    pendingCount: 0,
    errorCount: 0
  };
}

export function getSyncErrorDetails() {
  return [];
}

export function getLastSyncTime() {
  return null;
}

export function setLastSyncTime() {}

export function getLastSyncAttempt() {
  return null;
}

export function setLastSyncAttempt() {}

export function getSyncPendingDetails() {
  return [];
}

export function subscribeToSyncStatus() {
  return () => undefined;
}
