"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import { setUnauthorizedHandler } from "../../../shared/services";
import { authService } from "../services/auth.service";
import type {
  AuthContextValue,
  AuthSession,
  LoginValues
} from "../types/auth.types";

// Only the refresh token is persisted — in sessionStorage (tab-lifetime),
// so the short-lived access token never hits disk and a new browser
// session always requires a fresh login.
const REFRESH_STORAGE_KEY = "agrogest-admin-refresh-token";

export const AuthSessionContext = createContext<AuthContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  const logout = useCallback(() => {
    clearStoredRefreshToken();
    setSession(null);
    setStatus("guest");
  }, []);

  const refreshUser = useCallback(async () => {
    const storedRefreshToken = readStoredRefreshToken();

    if (!storedRefreshToken) {
      setSession(null);
      setStatus("guest");
      return;
    }

    try {
      const refreshed = await authService.refresh(storedRefreshToken);
      const user = await authService.getCurrentUser(
        refreshed.accessToken,
        refreshed.tokenType
      );

      const nextSession: AuthSession = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenType: refreshed.tokenType,
        expiresIn: refreshed.expiresIn,
        user
      };

      persistRefreshToken(refreshed.refreshToken);
      setSession(nextSession);
      setStatus("authenticated");
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Global 401 hook: attempt a silent refresh once; if it fails, log out.
  useEffect(() => {
    return setUnauthorizedHandler(() => {
      const storedRefreshToken = readStoredRefreshToken();

      if (!storedRefreshToken) {
        clearStoredRefreshToken();
        setSession(null);
        setStatus("guest");
        return;
      }

      void authService
        .refresh(storedRefreshToken)
        .then(async (refreshed) => {
          const user = await authService.getCurrentUser(
            refreshed.accessToken,
            refreshed.tokenType
          );
          persistRefreshToken(refreshed.refreshToken);
          setSession({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            tokenType: refreshed.tokenType,
            expiresIn: refreshed.expiresIn,
            user
          });
          setStatus("authenticated");
        })
        .catch(() => {
          clearStoredRefreshToken();
          setSession(null);
          setStatus("guest");
        });
    });
  }, []);

  const login = useCallback(async (values: LoginValues) => {
    const nextSession = await authService.login(values);

    persistRefreshToken(nextSession.refreshToken);
    setSession(nextSession);
    setStatus("authenticated");

    return nextSession;
  }, []);

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
