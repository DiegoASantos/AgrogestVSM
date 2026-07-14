import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { useIsOnline } from "../connectivity/use-is-online";
import { refreshCatalogsIfStale } from "../database/seed-catalogs";
import { debugLog } from "../utils/debug-log";
import {
  getLastSyncTime,
  getSyncCounts,
  setLastSyncAttempt
} from "./sync-status";
import { processOutbox } from "./sync-engine";
import { createDefaultSyncManager } from "./sync-state-store";
import { createSyncRunResult, type SyncRunResult } from "./sync-result";
import { subscribeToSyncRequests, type SyncRequestOptions } from "./sync-requests";

const SYNC_INTERVAL_MS = 30 * 1000;
const OUTBOX_SYNC_DEBOUNCE_MS = 750;
const RECONNECT_RETRY_DELAYS_MS = [10_000, 30_000, 90_000] as const;

export function useSync() {
  const { isOnline } = useIsOnline();
  const { authRevision, ensureOnlineSession, isAuthenticated } = useAuthSession();
  const isSyncingRef = useRef(false);
  const isOnlineRef = useRef(isOnline);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const ensureOnlineSessionRef = useRef(ensureOnlineSession);
  const scheduledSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledSyncResolveRef = useRef<((result: SyncRunResult | null) => void) | null>(
    null
  );
  const reconnectRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeRunRef = useRef<Promise<SyncRunResult> | null>(null);
  const syncManagerRef = useRef(createDefaultSyncManager());
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  isOnlineRef.current = isOnline;
  isAuthenticatedRef.current = isAuthenticated;
  ensureOnlineSessionRef.current = ensureOnlineSession;

  const clearReconnectRetryTimers = useCallback(() => {
    clearTimers(reconnectRetryTimersRef.current);
    reconnectRetryTimersRef.current = [];
  }, []);

  const finishRun = useCallback((result: SyncRunResult) => {
    try {
      setLastSyncAttempt(result);
    } catch {
      // El estado visible de sync no debe bloquear el ciclo.
    }

    return result;
  }, []);

  const executeSync = useCallback(async (
    options: SyncRequestOptions = {}
  ): Promise<SyncRunResult> => {
    if (isSyncingRef.current) {
      return finishRun(
        createSyncRunResult(
          "already_running",
          "Ya hay una sincronizacion en curso. Se programo un nuevo intento."
        )
      );
    }

    if (!isOnlineRef.current || !isAuthenticatedRef.current) {
      return finishRun(
        createSyncRunResult(
          !isOnlineRef.current ? "offline" : "unauthenticated",
          !isOnlineRef.current
            ? "Sin conexion. Tus datos siguen guardados localmente."
            : "No hay una sesion activa para sincronizar."
        )
      );
    }

    const adaptiveDelayMs = syncManagerRef.current.getDelayUntilNextRunMs(
      isOnlineRef.current
    );

    if (!options.bypassBackoff && adaptiveDelayMs !== null && adaptiveDelayMs > 0) {
      return finishRun(
        createSyncRunResult(
          "backoff",
          `Red inestable. El siguiente intento automatico se hara en ${formatDelay(adaptiveDelayMs)}.`
        )
      );
    }

    isSyncingRef.current = true;
    const controller = new AbortController();
    const deadline = setTimeout(
      () => controller.abort(),
      options.manual ? 30_000 : 45_000
    );

    try {
      const onlineSession = await ensureOnlineSessionRef.current({
        forceRefresh: options.forceAuthRefresh,
        signal: controller.signal
      });

      if (onlineSession !== "valid") {
        const status =
          onlineSession === "reauth_required"
            ? "reauth_required"
            : onlineSession === "temporarily_unavailable"
              ? "auth_temporarily_unavailable"
              : "auth_failed";
        const message =
          onlineSession === "reauth_required"
            ? "Sesion online vencida; inicia sesion para sincronizar."
            : onlineSession === "temporarily_unavailable"
              ? "No se pudo validar la sesion por la calidad de la red. Se reintentara automaticamente."
              : "No se pudo validar la sesion online.";
        return finishRun(
          createSyncRunResult(status, message)
        );
      }

      const result = await processOutbox({ signal: controller.signal });
      const attemptedItems = result.processed + result.skipped + result.errors;

      if (attemptedItems > 0) {
        syncManagerRef.current.recordOutcome(
          result.successfulRequests,
          result.transientFailures
        );
      }

      if (
        options.manual &&
        !result.aborted &&
        result.transientFailures === 0 &&
        result.errors === 0
      ) {
        syncManagerRef.current.resetState();
      }

      if (result.processed > 0 || result.errors > 0) {
        debugLog("Sync", "Cycle completed", result);
      }

      void refreshCatalogsIfStale().catch(() => {
        // Catalog pull has its own state and must not retain the outbox indicator.
      });

      const counts = getSyncCounts();
      const lastTime = getLastSyncTime();
      setSyncCounts(counts);
      setLastSyncTime(lastTime);
      if (result.aborted) {
        return finishRun(
          createSyncRunResult(
            "timed_out",
            "La sincronizacion excedio el tiempo de espera. Los datos pendientes se conservaron.",
            result
          )
        );
      }

      return finishRun(
        createSyncRunResult(
          result.errors > 0 ? "failed" : "success",
          result.errors > 0
            ? "La sincronizacion termino con errores en algunos registros."
            : result.processed > 0
              ? "Datos sincronizados correctamente."
              : "No habia datos nuevos para sincronizar.",
          result
        )
      );
    } catch (error) {
      debugLog("Sync", "Cycle error", { name: error instanceof Error ? error.name : "unknown" });
      syncManagerRef.current.recordAttempt(false);
      return finishRun(
        createSyncRunResult(
          "failed",
          error instanceof Error
            ? error.message
            : "La sincronizacion fallo por un error inesperado."
        )
      );
    } finally {
      clearTimeout(deadline);
      isSyncingRef.current = false;
    }
  }, [finishRun]);

  const runSync = useCallback(
    (options: SyncRequestOptions = {}): Promise<SyncRunResult> => {
      if (activeRunRef.current) {
        return activeRunRef.current;
      }

      const activeRun = executeSync(options).finally(() => {
        if (activeRunRef.current === activeRun) {
          activeRunRef.current = null;
        }
      });
      activeRunRef.current = activeRun;
      return activeRun;
    },
    [executeSync]
  );

  const scheduleSync = useCallback(
    (options: SyncRequestOptions = {}) => {
      if (scheduledSyncRef.current) {
        clearTimeout(scheduledSyncRef.current);
        scheduledSyncResolveRef.current?.(null);
      }

      const adaptiveDelayMs =
        options.bypassBackoff
          ? 0
          : syncManagerRef.current.getDelayUntilNextRunMs(isOnlineRef.current);
      const requestedDelayMs = options.immediate ? 0 : OUTBOX_SYNC_DEBOUNCE_MS;
      const delayMs =
        adaptiveDelayMs === null
          ? requestedDelayMs
          : Math.max(requestedDelayMs, adaptiveDelayMs);

      return new Promise<SyncRunResult | null>((resolve) => {
        scheduledSyncResolveRef.current = resolve;
        scheduledSyncRef.current = setTimeout(
          async () => {
            scheduledSyncRef.current = null;
            scheduledSyncResolveRef.current = null;
            const result = await runSync(options);
            resolve(result);
          },
          delayMs
        );
      });
    },
    [runSync]
  );

  useEffect(() => {
    return subscribeToSyncRequests(scheduleSync);
  }, [scheduleSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        scheduleSync();
      }
    });

    return () => subscription.remove();
  }, [scheduleSync]);

  useEffect(() => {
    return () => {
      if (scheduledSyncRef.current) {
        clearTimeout(scheduledSyncRef.current);
        scheduledSyncRef.current = null;
      }

      scheduledSyncResolveRef.current?.(null);
      scheduledSyncResolveRef.current = null;
      clearReconnectRetryTimers();
    };
  }, [clearReconnectRetryTimers]);

  useEffect(() => {
    if (!isOnline || !isAuthenticated) {
      return;
    }

    void runSync();

    reconnectRetryTimersRef.current = RECONNECT_RETRY_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        void runSync();
      }, delay)
    );

    const interval = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearReconnectRetryTimers();
    };
  }, [clearReconnectRetryTimers, isOnline, isAuthenticated, runSync]);

  useEffect(() => {
    if (authRevision <= 0 || !isAuthenticated || !isOnline) {
      return;
    }

    syncManagerRef.current.resetState();
    void runSync({ bypassBackoff: true, immediate: true });
  }, [authRevision, isAuthenticated, isOnline, runSync]);

  return { runSync, lastSyncTime, syncCounts };
}

function clearTimers(timers: ReturnType<typeof setTimeout>[]) {
  for (const timer of timers) {
    clearTimeout(timer);
  }
}

function formatDelay(delayMs: number) {
  const totalSeconds = Math.ceil(delayMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  return `${Math.ceil(totalSeconds / 60)}min`;
}
