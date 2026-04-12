import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import {
  clearApiToken,
  hydrateApiToken,
  setApiToken
} from "../../../shared/services/api/auth-store";
import { getDatabase } from "../../../shared/database/connection";
import { isAccessTokenExpired } from "../../../shared/utils/auth-token";
import type { AuthLoginResult, AuthSession, AuthUser } from "../types/auth.types";

type AuthSessionContextValue = {
  session: AuthSession;
  isAuthenticated: boolean;
  signIn: (nextSession: AuthLoginResult) => void;
  signOut: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(
  undefined
);

const GUEST_SESSION: AuthSession = {
  status: "guest",
  accessToken: null,
  tokenType: null,
  expiresIn: null,
  user: null
};

function persistUserSession(session: AuthLoginResult) {
  try {
    const db = getDatabase();
    const payload = JSON.stringify({
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      user: session.user
    });

    db.runSync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      "auth_session_data",
      payload
    );
  } catch {
    // Session persistence is best effort and should not block sign-in.
  }
}

function clearPersistedSession() {
  try {
    const db = getDatabase();
    db.runSync(
      `DELETE FROM app_meta WHERE key IN (?, ?)`,
      "auth_session_data",
      "auth_access_token"
    );
  } catch {
    // Cleanup should not block logout if local persistence is unavailable.
  }
}

function loadPersistedSession(): AuthSession {
  try {
    const token = hydrateApiToken();

    if (!token) {
      return GUEST_SESSION;
    }

    if (isAccessTokenExpired(token)) {
      clearApiToken();
      clearPersistedSession();
      return GUEST_SESSION;
    }

    const db = getDatabase();
    const row = db.getFirstSync<{ value: string | null }>(
      `SELECT value FROM app_meta WHERE key = ? LIMIT 1`,
      "auth_session_data"
    );

    if (!row?.value) {
      clearApiToken();
      return GUEST_SESSION;
    }

    const data = JSON.parse(row.value) as {
      tokenType: string;
      expiresIn: string;
      user: AuthUser;
    };

    if (
      typeof data.tokenType !== "string" ||
      typeof data.expiresIn !== "string" ||
      !data.user
    ) {
      clearApiToken();
      clearPersistedSession();
      return GUEST_SESSION;
    }

    return {
      status: "authenticated",
      accessToken: token,
      tokenType: data.tokenType,
      expiresIn: data.expiresIn,
      user: data.user
    };
  } catch {
    clearApiToken();
    clearPersistedSession();
    return GUEST_SESSION;
  }
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(GUEST_SESSION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = loadPersistedSession();
    setSession(restored);
    setHydrated(true);
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      isAuthenticated: session.status === "authenticated",
      signIn: (nextSession) => {
        setApiToken(nextSession.accessToken);
        persistUserSession(nextSession);
        setSession({
          status: "authenticated",
          accessToken: nextSession.accessToken,
          tokenType: nextSession.tokenType,
          expiresIn: nextSession.expiresIn,
          user: nextSession.user
        });
      },
      signOut: () => {
        clearApiToken();
        clearPersistedSession();
        setSession(GUEST_SESSION);
      }
    }),
    [session]
  );

  if (!hydrated) {
    return null;
  }

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error(
      "useAuthSessionContext must be used within an AuthSessionProvider."
    );
  }

  return context;
}
