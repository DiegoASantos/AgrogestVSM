import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";

import { initDatabase, getDatabase } from "../../../shared/database/connection";
import {
  clearApiToken,
  setApiToken,
  setTokenRefreshHandler
} from "../../../shared/services/api/auth-store";
import {
  clearAuthTokens,
  loadAuthTokens,
  storeAuthTokens
} from "../../../shared/services/api/secure-token-store";
import { isAccessTokenExpired } from "../../../shared/utils/auth-token";
import { authService } from "../services";
import {
  classifyRefreshFailure,
  isRefreshCooldownActive
} from "./auth-session-policy";
import type {
  AuthLoginResult,
  AuthSession,
  AuthUser,
  EnsureOnlineSessionOptions,
  EnsureOnlineSessionResult,
  OnlineSessionStatus
} from "../types/auth.types";

type AuthSessionContextValue = {
  session: AuthSession;
  isAuthenticated: boolean;
  onlineSessionStatus: OnlineSessionStatus;
  authRevision: number;
  signIn: (nextSession: AuthLoginResult) => Promise<void>;
  signOut: () => void;
  ensureOnlineSession: (
    options?: EnsureOnlineSessionOptions
  ) => Promise<EnsureOnlineSessionResult>;
};

const OFFLINE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_FAILURE_COOLDOWN_MS = 60_000;

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

const GUEST_SESSION: AuthSession = {
  status: "guest",
  accessToken: null,
  tokenType: null,
  expiresIn: null,
  offlineSessionExpiresAt: null,
  user: null
};

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(GUEST_SESSION);
  const [onlineSessionStatus, setOnlineSessionStatus] =
    useState<OnlineSessionStatus>("unavailable");
  const [authRevision, setAuthRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef<AuthSession>(GUEST_SESSION);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<EnsureOnlineSessionResult> | null>(null);
  const refreshCooldownUntilRef = useRef(0);

  const setActiveSession = useCallback(
    async (result: AuthLoginResult, source: "login" | "refresh" = "login") => {
      const nextSession = toAuthenticatedSession(result);

      setApiToken(nextSession.accessToken);
      refreshTokenRef.current = result.refreshToken;
      await storeAuthTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      persistSessionMetadata(nextSession);
      sessionRef.current = nextSession;
      setSession(nextSession);
      refreshCooldownUntilRef.current = 0;
      setOnlineSessionStatus("valid");

      if (source === "login") {
        setAuthRevision((current) => current + 1);
      }
    },
    []
  );

  const clearLocalSession = useCallback(() => {
    clearApiToken();
    refreshTokenRef.current = null;
    refreshCooldownUntilRef.current = 0;
    clearPersistedSessionMetadata();
    void clearAuthTokens().catch(() => {
      // Local state is already cleared even if secure storage is unavailable.
    });
    sessionRef.current = GUEST_SESSION;
    setSession(GUEST_SESSION);
    setOnlineSessionStatus("unavailable");
  }, []);

  const signOut = useCallback(() => {
    const refreshToken = refreshTokenRef.current;
    clearLocalSession();

    if (refreshToken) {
      void authService.logout(refreshToken).catch(() => {
        // Local logout remains valid when the device is offline.
      });
    }
  }, [clearLocalSession]);

  const ensureOnlineSession = useCallback(
    async (
      options: EnsureOnlineSessionOptions = {}
    ): Promise<EnsureOnlineSessionResult> => {
      const { forceRefresh = false, signal } = options;
      const currentSession = sessionRef.current;

      if (currentSession.status !== "authenticated") {
        return "unauthenticated";
      }

      if (
        !forceRefresh &&
        currentSession.accessToken &&
        !isAccessTokenExpired(currentSession.accessToken)
      ) {
        setApiToken(currentSession.accessToken);
        setOnlineSessionStatus("valid");
        return "valid";
      }

      if (isRefreshCooldownActive(refreshCooldownUntilRef.current)) {
        setOnlineSessionStatus("temporarily_unavailable");
        return "temporarily_unavailable";
      }

      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const refreshRequest = (async () => {
        const tokens = await loadAuthTokens();
        const refreshToken = refreshTokenRef.current ?? tokens?.refreshToken;

        if (!refreshToken) {
          setOnlineSessionStatus("reauth_required");
          return "reauth_required";
        }

        try {
          const nextSession = await authService.refresh(refreshToken, { signal });
          await setActiveSession(nextSession, "refresh");
          return "valid";
        } catch (error) {
          if (classifyRefreshFailure(error) === "reauth_required") {
            clearApiToken();
            refreshTokenRef.current = null;
            await clearAuthTokens().catch(() => undefined);

            const offlineSession: AuthSession = {
              ...sessionRef.current,
              accessToken: null
            };
            sessionRef.current = offlineSession;
            setSession(offlineSession);
            persistSessionMetadata(offlineSession);
            setOnlineSessionStatus("reauth_required");
            return "reauth_required";
          }

          refreshCooldownUntilRef.current = Date.now() + REFRESH_FAILURE_COOLDOWN_MS;
          setOnlineSessionStatus("temporarily_unavailable");
          return "temporarily_unavailable";
        }
      })();

      refreshInFlightRef.current = refreshRequest;

      try {
        return await refreshRequest;
      } finally {
        refreshInFlightRef.current = null;
      }
    },
    [setActiveSession]
  );

  useEffect(() => {
    void loadPersistedSession().then((restored) => {
      refreshTokenRef.current = restored.refreshToken;
      sessionRef.current = restored.session;
      setSession(restored.session);
      setOnlineSessionStatus(restored.onlineSessionStatus);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    setTokenRefreshHandler(async (options) => {
      const refreshed = await ensureOnlineSession({
        forceRefresh: true,
        signal: options?.signal
      });
      return refreshed === "valid" ? sessionRef.current.accessToken : null;
    });

    return () => {
      setTokenRefreshHandler(null);
    };
  }, [ensureOnlineSession]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      isAuthenticated: session.status === "authenticated",
      onlineSessionStatus,
      authRevision,
      signIn: (nextSession) => setActiveSession(nextSession, "login"),
      signOut,
      ensureOnlineSession
    }),
    [
      authRevision,
      ensureOnlineSession,
      onlineSessionStatus,
      session,
      setActiveSession,
      signOut
    ]
  );

  if (!hydrated) {
    return null;
  }

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSessionContext must be used within an AuthSessionProvider.");
  }

  return context;
}

function toAuthenticatedSession(result: AuthLoginResult): AuthSession {
  return {
    status: "authenticated",
    accessToken: result.accessToken,
    tokenType: result.tokenType,
    expiresIn: result.expiresIn,
    offlineSessionExpiresAt: new Date(Date.now() + OFFLINE_SESSION_TTL_MS).toISOString(),
    user: result.user
  };
}

function persistSessionMetadata(session: AuthSession) {
  try {
    const db = getDatabase();
    const payload = JSON.stringify({
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      offlineSessionExpiresAt: session.offlineSessionExpiresAt,
      user: session.user
    });

    db.runSync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      "auth_session_data",
      payload
    );
  } catch {
    // Persistence is best effort and should not block an active online login.
  }
}

function clearPersistedSessionMetadata() {
  try {
    getDatabase().runSync(
      `DELETE FROM app_meta WHERE key IN (?, ?)`,
      "auth_session_data",
      "auth_access_token"
    );
  } catch {
    // Cleanup should not block local logout.
  }
}

async function loadPersistedSession(): Promise<{
  session: AuthSession;
  refreshToken: string | null;
  onlineSessionStatus: OnlineSessionStatus;
}> {
  try {
    initDatabase();
    const tokens = await loadAuthTokens();
    const row = getDatabase().getFirstSync<{ value: string | null }>(
      `SELECT value FROM app_meta WHERE key = ? LIMIT 1`,
      "auth_session_data"
    );

    if (!row?.value) {
      await clearInvalidPersistedSession();
      return {
        session: GUEST_SESSION,
        refreshToken: null,
        onlineSessionStatus: "unavailable"
      };
    }

    const data = JSON.parse(row.value) as {
      tokenType: string;
      expiresIn: string;
      offlineSessionExpiresAt: string;
      user: AuthUser;
    };

    const offlineSessionExpiresAt = new Date(data.offlineSessionExpiresAt).getTime();

    if (
      typeof data.tokenType !== "string" ||
      typeof data.expiresIn !== "string" ||
      typeof data.offlineSessionExpiresAt !== "string" ||
      !data.user ||
      !Number.isFinite(offlineSessionExpiresAt) ||
      Date.now() >= offlineSessionExpiresAt
    ) {
      await clearInvalidPersistedSession();
      return {
        session: GUEST_SESSION,
        refreshToken: null,
        onlineSessionStatus: "unavailable"
      };
    }

    setApiToken(tokens?.accessToken ?? null);

    return {
      session: {
        status: "authenticated",
        accessToken: tokens?.accessToken ?? null,
        tokenType: data.tokenType,
        expiresIn: data.expiresIn,
        offlineSessionExpiresAt: data.offlineSessionExpiresAt,
        user: data.user
      },
      refreshToken: tokens?.refreshToken ?? null,
      onlineSessionStatus: tokens ? "valid" : "reauth_required"
    };
  } catch {
    await clearInvalidPersistedSession();
    return {
      session: GUEST_SESSION,
      refreshToken: null,
      onlineSessionStatus: "unavailable"
    };
  }
}

async function clearInvalidPersistedSession() {
  clearApiToken();
  clearPersistedSessionMetadata();
  await clearAuthTokens();
}
