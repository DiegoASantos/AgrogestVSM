type SyncStatusListener = () => void;

const listeners = new Set<SyncStatusListener>();

export function notifySyncStatusChanged() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToSyncStatus(listener: SyncStatusListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
