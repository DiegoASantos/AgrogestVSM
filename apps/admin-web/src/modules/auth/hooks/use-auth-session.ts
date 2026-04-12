"use client";

import { useContext } from "react";

import { AuthSessionContext } from "../state/auth-session-provider";

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}
