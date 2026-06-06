import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { useIsOnline } from "../connectivity/use-is-online";
import { refreshCatalogsIfStale } from "../database/seed-catalogs";
import { debugLog } from "../utils/debug-log";
import { getLastSyncTime, getSyncCounts } from "./sync-status";
import { processOutbox } from "./sync-engine";
import { subscribeToSyncRequests } from "./sync-requests";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const OUTBOX_SYNC_DEBOUNCE_MS = 750;

export function useSync() {
  const { isOnline } = useIsOnline();
  const { ensureOnlineSession, isAuthenticated } = useAuthSession();
  const isSyncingRef = useRef(false);
  const isOnlineRef = useRef(isOnline);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const ensureOnlineSessionRef = useRef(ensureOnlineSession);
  const scheduledSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rerunAfterCurrentSyncRef = useRef(false);
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  isOnlineRef.current = isOnline;
  isAuthenticatedRef.current = isAuthenticated;
  ensureOnlineSessionRef.current = ensureOnlineSession;

  const runSync = useCallback(async (forceRefresh = false) => {
    if (isSyncingRef.current) {
      rerunAfterCurrentSyncRef.current = true;
      return;
    }

    if (!isOnlineRef.current || !isAuthenticatedRef.current) {
      return;
    }

    isSyncingRef.current = true;

    try {
      const hasOnlineSession = await ensureOnlineSessionRef.current(forceRefresh);

      if (!hasOnlineSession) {
        return;
      }

      const result = await processOutbox();

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
    } catch (error) {
      console.warn("Sync cycle failed:", error);
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
  }, []);

  const scheduleSync = useCallback(() => {
    if (scheduledSyncRef.current) {
      clearTimeout(scheduledSyncRef.current);
    }

    scheduledSyncRef.current = setTimeout(() => {
      scheduledSyncRef.current = null;
      void runSync();
    }, OUTBOX_SYNC_DEBOUNCE_MS);
  }, [runSync]);

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
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !isAuthenticated) {
      return;
    }

    void runSync(true);

    const interval = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, isAuthenticated, runSync]);

  return { runSync, lastSyncTime, syncCounts };
}
