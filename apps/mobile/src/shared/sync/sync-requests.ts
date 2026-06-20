import type { SyncRunResult } from "./sync-result";

export type SyncRequestOptions = {
  forceRefresh?: boolean;
  immediate?: boolean;
};

type SyncRequestListener = (
  options?: SyncRequestOptions
) => Promise<SyncRunResult | null | void> | SyncRunResult | null | void;

const listeners = new Set<SyncRequestListener>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOptions: SyncRequestOptions | null = null;
let pendingRequest: Promise<SyncRunResult | null> | null = null;

export function requestSync(options: SyncRequestOptions = {}) {
  pendingOptions = {
    forceRefresh: Boolean(pendingOptions?.forceRefresh || options.forceRefresh),
    immediate: Boolean(pendingOptions?.immediate || options.immediate)
  };

  if (notifyTimer && pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = new Promise<SyncRunResult | null>((resolve) => {
    notifyTimer = setTimeout(() => {
      const nextOptions = pendingOptions ?? {};
      notifyTimer = null;
      pendingOptions = null;

      void Promise.allSettled(
        Array.from(listeners).map((listener) => listener(nextOptions))
      ).then((results) => {
        const syncResult =
          results.find(
            (result): result is PromiseFulfilledResult<SyncRunResult> =>
              result.status === "fulfilled" && Boolean(result.value)
          )?.value ?? null;

        pendingRequest = null;
        resolve(syncResult);
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
