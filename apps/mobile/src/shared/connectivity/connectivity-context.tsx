import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { AppState } from "react-native";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { initDatabase } from "../database/connection";
import { apiRequest } from "../services";
import { scheduleSync } from "../sync/sync-requests";
import {
  createInitialSyncManagerState,
  SLOW_NETWORK_REQUEST_MS,
  type SyncManagerState
} from "../sync/sync-manager";
import { createDefaultSyncManager } from "../sync/sync-state-store";
import { getNetworkPreference, saveNetworkPreference } from "./connectivity-preference";
import { setConnectivityPolicySnapshot } from "./connectivity-policy";
import type {
  EffectiveNetworkMode,
  NetworkPreference,
  NetworkQuality
} from "./connectivity-types";
import { subscribeToNetworkObservations } from "./network-telemetry";

const RECOVERY_PROBE_INTERVAL_MS = 30_000;
const RECOVERY_PROBE_TIMEOUT_MS = 5_000;

type ConnectivityContextValue = {
  checkConnectionNow: () => Promise<boolean>;
  effectiveMode: EffectiveNetworkMode;
  isCheckingConnection: boolean;
  isOnline: boolean;
  isPhysicallyOnline: boolean;
  preference: NetworkPreference;
  quality: NetworkQuality;
  setPreference: (preference: NetworkPreference) => void;
};

export const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const { session } = useAuthSession();
  const userId = session.user?.publicId ?? null;
  const managerRef = useRef(createDefaultSyncManager());
  const previousEffectiveModeRef = useRef<EffectiveNetworkMode>("online");
  const [managerState, setManagerState] = useState<SyncManagerState>(() =>
    createInitialSyncManagerState(new Date().toISOString())
  );
  const [isPhysicallyOnline, setIsPhysicallyOnline] = useState(true);
  const [hasNetworkState, setHasNetworkState] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [preference, setPreferenceState] = useState<NetworkPreference>("automatic");
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const db = initDatabase();
    const nextManagerState = managerRef.current.getState();
    const nextPreference = getNetworkPreference(userId, db);
    const nextQuality = managerRef.current.evaluateConnection(
      isPhysicallyOnline,
      nextManagerState
    );
    const nextEffectiveMode =
      nextPreference === "offline"
        ? "offline_manual"
        : nextQuality === "unstable"
          ? "offline_auto"
          : "online";

    setConnectivityPolicySnapshot({
      effectiveMode: nextEffectiveMode,
      isPhysicallyOnline,
      preference: nextPreference
    });
    setManagerState(nextManagerState);
    setPreferenceState(nextPreference);
    setLoadedUserId(userId);
  }, [userId]);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const physicallyOnline =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsPhysicallyOnline(physicallyOnline);
      setHasNetworkState(true);
    });
  }, []);

  useEffect(() => {
    return subscribeToNetworkObservations((observation) => {
      const nextState = managerRef.current.recordAttempt(
        observation.success,
        observation.durationMs
      );
      setManagerState(nextState);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => subscription.remove();
  }, []);

  const quality = useMemo<NetworkQuality>(() => {
    if (!hasNetworkState) {
      return "checking";
    }

    if (!isPhysicallyOnline) {
      return "none";
    }

    return managerRef.current.evaluateConnection(true, managerState);
  }, [hasNetworkState, isPhysicallyOnline, managerState]);

  const effectiveMode = useMemo<EffectiveNetworkMode>(() => {
    if (preference === "offline") {
      return "offline_manual";
    }

    return quality === "unstable" ? "offline_auto" : "online";
  }, [preference, quality]);

  const isOnline = isPhysicallyOnline && effectiveMode === "online";

  useEffect(() => {
    setConnectivityPolicySnapshot({
      effectiveMode,
      isPhysicallyOnline,
      preference
    });
  }, [effectiveMode, isPhysicallyOnline, preference]);

  useEffect(() => {
    const previousMode = previousEffectiveModeRef.current;
    previousEffectiveModeRef.current = effectiveMode;

    if (previousMode === "offline_auto" && effectiveMode === "online") {
      void scheduleSync({ immediate: true, bypassBackoff: true });
    }
  }, [effectiveMode]);

  const runProbe = useCallback(
    async (forceRecovery: boolean) => {
      if (!isPhysicallyOnline || preference !== "automatic") {
        return false;
      }

      const startedAt = Date.now();
      setIsCheckingConnection(true);

      try {
        await apiRequest<{
          status: string;
        }>("/health", {
          networkPolicy: "probe",
          timeoutMs: RECOVERY_PROBE_TIMEOUT_MS
        });
        const isResponsive = Date.now() - startedAt < SLOW_NETWORK_REQUEST_MS;

        if (forceRecovery && isResponsive) {
          setManagerState(managerRef.current.resetState());
          void scheduleSync({ immediate: true, bypassBackoff: true, manual: true });
        }

        return isResponsive;
      } catch {
        return false;
      } finally {
        setIsCheckingConnection(false);
      }
    },
    [isPhysicallyOnline, preference]
  );

  useEffect(() => {
    if (
      !isAppActive ||
      !isPhysicallyOnline ||
      preference !== "automatic" ||
      quality !== "unstable"
    ) {
      return;
    }

    void runProbe(false);
    const interval = setInterval(() => {
      void runProbe(false);
    }, RECOVERY_PROBE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAppActive, isPhysicallyOnline, preference, quality, runProbe]);

  const setPreference = useCallback(
    (nextPreference: NetworkPreference) => {
      setPreferenceState(nextPreference);

      if (userId) {
        saveNetworkPreference(userId, nextPreference, initDatabase());
      }
    },
    [userId]
  );

  const checkConnectionNow = useCallback(() => runProbe(true), [runProbe]);

  const value = useMemo<ConnectivityContextValue>(
    () => ({
      checkConnectionNow,
      effectiveMode,
      isCheckingConnection,
      isOnline,
      isPhysicallyOnline,
      preference,
      quality,
      setPreference
    }),
    [
      checkConnectionNow,
      effectiveMode,
      isCheckingConnection,
      isOnline,
      isPhysicallyOnline,
      preference,
      quality,
      setPreference
    ]
  );

  if (loadedUserId !== userId) {
    return null;
  }

  return (
    <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
  );
}
