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
  const { ensureOnlineSession, isAuthenticated } = useAuthSession();
  const isSyncingRef = useRef(false);
  const isOnlineRef = useRef(isOnline);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const ensureOnlineSessionRef = useRef(ensureOnlineSession);
  const scheduledSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledSyncResolveRef = useRef<((result: SyncRunResult | null) => void) | null>(
    null
  );
  const reconnectRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rerunAfterCurrentSyncRef = useRef(false);
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

  const runSync = useCallback(async (forceRefresh = false): Promise<SyncRunResult> => {
    if (isSyncingRef.current) {
      rerunAfterCurrentSyncRef.current = true;
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

    if (!forceRefresh && adaptiveDelayMs !== null && adaptiveDelayMs > 0) {
      return finishRun(
        createSyncRunResult(
          "backoff",
          `Red inestable. El siguiente intento automatico se hara en ${formatDelay(adaptiveDelayMs)}.`
        )
      );
    }

    isSyncingRef.current = true;

    try {
      const hasOnlineSession = await ensureOnlineSessionRef.current(forceRefresh);

      if (!hasOnlineSession) {
        return finishRun(
          createSyncRunResult(
            "auth_failed",
            "No se pudo validar la sesion online. Revisa tu conexion o vuelve a iniciar sesion."
          )
        );
      }

      const result = await processOutbox();
      const attemptedItems = result.processed + result.skipped + result.errors;

      if (attemptedItems > 0) {
        syncManagerRef.current.recordAttempt(result.skipped === 0 && result.errors === 0);
      }

      if (result.processed > 0 || result.errors > 0) {
        debugLog("Sync", "Cycle completed", result);
      }

      try {
        await refreshCatalogsIfStale();
      } catch {
        // Pull failure should not block sync cycle
      }

      const counts = getSyncCounts();
      const lastTime = getLastSyncTime();
      setSyncCounts(counts);
      setLastSyncTime(lastTime);
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
      console.warn("Sync cycle failed:", error);
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
      isSyncingRef.current = false;

      if (rerunAfterCurrentSyncRef.current) {
        rerunAfterCurrentSyncRef.current = false;
        scheduledSyncRef.current = setTimeout(() => {
          scheduledSyncRef.current = null;
          void runSync();
        }, 0);
      }
    }
  }, [finishRun]);

  const scheduleSync = useCallback(
    (options: SyncRequestOptions = {}) => {
      if (scheduledSyncRef.current) {
        clearTimeout(scheduledSyncRef.current);
        scheduledSyncResolveRef.current?.(null);
      }

      const adaptiveDelayMs =
        options.forceRefresh
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
            const result = await runSync(Boolean(options.forceRefresh));
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

    void runSync(false);

    reconnectRetryTimersRef.current = RECONNECT_RETRY_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        void runSync(false);
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
