export type SyncRequestOptions = {
  forceRefresh?: boolean;
  immediate?: boolean;
};

type SyncRequestListener = (options?: SyncRequestOptions) => Promise<void> | void;

const listeners = new Set<SyncRequestListener>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOptions: SyncRequestOptions | null = null;
let pendingRequest: Promise<void> | null = null;

export function requestSync(options: SyncRequestOptions = {}) {
  pendingOptions = {
    forceRefresh: Boolean(pendingOptions?.forceRefresh || options.forceRefresh),
    immediate: Boolean(pendingOptions?.immediate || options.immediate)
  };

  if (notifyTimer && pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = new Promise<void>((resolve) => {
    notifyTimer = setTimeout(() => {
      const nextOptions = pendingOptions ?? {};
      notifyTimer = null;
      pendingOptions = null;

      void Promise.allSettled(
        Array.from(listeners).map((listener) => listener(nextOptions))
      ).finally(() => {
        pendingRequest = null;
        resolve();
      });
    }, 0);
  });

  return pendingRequest;
}

export function subscribeToSyncRequests(listener: SyncRequestListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
