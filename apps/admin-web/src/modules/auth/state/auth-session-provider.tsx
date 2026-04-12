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

const AUTH_STORAGE_KEY = "agrogest-admin-auth-session";

export const AuthSessionContext = createContext<AuthContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setStatus("guest");
  }, []);

  const refreshUser = useCallback(async () => {
    setSession((currentSession) => currentSession);

    const storedSession = readStoredSession();

    if (!storedSession) {
      setSession(null);
      setStatus("guest");
      return;
    }

    if (isAccessTokenExpired(storedSession.accessToken)) {
      logout();
      return;
    }

    try {
      const user = await authService.getCurrentUser(
        storedSession.accessToken,
        storedSession.tokenType
      );

      const nextSession = {
        ...storedSession,
        user
      };

      persistSession(nextSession);
      setSession(nextSession);
      setStatus("authenticated");
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Register a global 401 hook so any API call can trigger auto-logout
  // instead of leaving the UI in a broken authenticated-but-unauthorized state.
  useEffect(() => {
    return setUnauthorizedHandler(() => {
      clearStoredSession();
      setSession(null);
      setStatus("guest");
    });
  }, []);

  const login = useCallback(async (values: LoginValues) => {
    const nextSession = await authService.login(values);

    persistSession(nextSession);
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

function persistSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawValue) as Partial<AuthSession>;

    if (
      !parsedSession ||
      typeof parsedSession.accessToken !== "string" ||
      typeof parsedSession.tokenType !== "string" ||
      typeof parsedSession.expiresIn !== "string" ||
      !parsedSession.user
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsedSession as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isAccessTokenExpired(accessToken: string) {
  const payload = parseJwtPayload(accessToken);
  const expiresAt = payload?.exp;

  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return false;
  }

  return Date.now() >= expiresAt * 1000;
}

function parseJwtPayload(accessToken: string): { exp?: number } | null {
  const tokenParts = accessToken.split(".");

  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, "=");

    return JSON.parse(window.atob(normalizedPayload)) as { exp?: number };
  } catch {
    return null;
  }
}
