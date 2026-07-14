import type { SyncRunResult } from "./sync-result";

export type SyncRequestOptions = {
  bypassBackoff?: boolean;
  forceAuthRefresh?: boolean;
  immediate?: boolean;
  manual?: boolean;
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
    bypassBackoff: Boolean(pendingOptions?.bypassBackoff || options.bypassBackoff),
    forceAuthRefresh: Boolean(
      pendingOptions?.forceAuthRefresh || options.forceAuthRefresh
    ),
    immediate: Boolean(pendingOptions?.immediate || options.immediate),
    manual: Boolean(pendingOptions?.manual || options.manual)
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

export function scheduleSync(options: SyncRequestOptions = {}) {
  return requestSync(options);
}

export function subscribeToSyncRequests(listener: SyncRequestListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
