import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { useIsOnline } from "../connectivity/use-is-online";
import { refreshCatalogsIfStale } from "../database/seed-catalogs";
import { debugLog } from "../utils/debug-log";
import { getLastSyncTime, getSyncCounts } from "./sync-status";
import { processOutbox } from "./sync-engine";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function useSync() {
  const { isOnline } = useIsOnline();
  const { isAuthenticated } = useAuthSession();
  const isSyncingRef = useRef(false);
  const isOnlineRef = useRef(isOnline);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  isOnlineRef.current = isOnline;
  isAuthenticatedRef.current = isAuthenticated;

  const runSync = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }

    if (!isOnlineRef.current || !isAuthenticatedRef.current) {
      return;
    }

    isSyncingRef.current = true;

    try {
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
    }
  }, []);

  useEffect(() => {
    if (!isOnline || !isAuthenticated) {
      return;
    }

    void runSync();

    const interval = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, isAuthenticated, runSync]);

  return { runSync, lastSyncTime, syncCounts };
}
