"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import { setAuthorizationResolver, setUnauthorizedHandler } from "../../../shared/services";
import { WebSessionManager } from "./web-session-manager";
import type {
  AuthContextValue,
  AuthSession
} from "../types/auth.types";

// Only the refresh token is persisted — in sessionStorage (tab-lifetime),
// so the short-lived access token never hits disk and a new browser
// session always requires a fresh login.
const REFRESH_STORAGE_KEY = "agrogest-admin-refresh-token";

export const AuthSessionContext = createContext<AuthContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  const [manager] = useState(() => new WebSessionManager({
    read: readStoredRefreshToken,
    write: persistRefreshToken,
    clear: clearStoredRefreshToken
  }, (next) => {
    setSession(next);
    setStatus(next ? "authenticated" : "guest");
  }));
  const { login, logout, refreshUser } = manager;

  useEffect(() => {
    const unregisterRecovery = setUnauthorizedHandler(manager.recover);
    const unregisterResolver = setAuthorizationResolver(manager.resolveAuthorization);
    return () => { unregisterRecovery(); unregisterResolver(); };
  }, [manager]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const restore = () => {
      if (retryTimer) clearTimeout(retryTimer);
      void refreshUser().catch((error: unknown) => {
        // A temporary outage must not delete the saved refresh token or redirect to login.
        if (!cancelled && (error as { statusCode?: number }).statusCode === 503) {
          retryTimer = setTimeout(restore, 5000);
        }
      });
    };
    restore();
    window.addEventListener("online", restore);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", restore);
    };
  }, [refreshUser]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      login,
      logout,
      refreshUser
    }),
    [login, logout, refreshUser, session, status]
  );

  return (
    <AuthSessionContext.Provider value={contextValue}>
      {children}
    </AuthSessionContext.Provider>
  );
}

function persistRefreshToken(refreshToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
}

function readStoredRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(REFRESH_STORAGE_KEY);

  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  return rawValue;
}

function clearStoredRefreshToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  // Also clean up the legacy localStorage key from older sessions.
  window.localStorage.removeItem("agrogest-admin-auth-session");
}
