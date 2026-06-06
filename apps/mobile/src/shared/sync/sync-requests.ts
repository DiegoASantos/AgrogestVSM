type SyncRequestListener = () => void;

const listeners = new Set<SyncRequestListener>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

export function requestSync() {
  if (notifyTimer) {
    return;
  }

  notifyTimer = setTimeout(() => {
    notifyTimer = null;

    for (const listener of Array.from(listeners)) {
      listener();
    }
  }, 0);
}

export function subscribeToSyncRequests(listener: SyncRequestListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
