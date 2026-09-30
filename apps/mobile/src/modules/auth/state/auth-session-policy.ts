import { toApiError } from "../../../shared/services/api/errors";
import type { AuthUser } from "../types/auth.types";

export const MOBILE_ANALYST_ACCESS_DENIED_MESSAGE =
  "El rol ANALISTA solo esta habilitado para el panel web.";

const LEGACY_OFFLINE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function resolveOfflineSessionExpiry(
  sessionExpiresAt: string | undefined,
  now = Date.now(),
  existingExpiresAt?: string | null
): string | null {
  if (sessionExpiresAt === undefined) {
    const legacyDeadline = now + LEGACY_OFFLINE_SESSION_TTL_MS;
    const existingDeadline = existingExpiresAt ? Date.parse(existingExpiresAt) : NaN;
    const fixedDeadline = Number.isFinite(existingDeadline)
      ? Math.min(legacyDeadline, existingDeadline)
      : legacyDeadline;
    return fixedDeadline > now ? new Date(fixedDeadline).toISOString() : null;
  }

  const expiresAt = Date.parse(sessionExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return null;
  }

  const existingDeadline = existingExpiresAt ? Date.parse(existingExpiresAt) : NaN;
  const fixedDeadline = Number.isFinite(existingDeadline)
    ? Math.min(expiresAt, existingDeadline)
    : expiresAt;
  return fixedDeadline > now ? new Date(fixedDeadline).toISOString() : null;
}

export function isOfflineSessionExpired(
  sessionExpiresAt: string | null,
  now = Date.now()
): boolean {
  if (!sessionExpiresAt) {
    return true;
  }

  const expiresAt = Date.parse(sessionExpiresAt);
  return !Number.isFinite(expiresAt) || now >= expiresAt;
}

export type RefreshFailureDisposition = "transient" | "reauth_required";

export function classifyRefreshFailure(error: unknown): RefreshFailureDisposition {
  const statusCode = toApiError(error).statusCode;

  return statusCode === 401 || statusCode === 403 ? "reauth_required" : "transient";
}

export function isRefreshCooldownActive(cooldownUntil: number, now = Date.now()) {
  return Number.isFinite(cooldownUntil) && now < cooldownUntil;
}

export function isAnalystUser(user: Pick<AuthUser, "roles"> | null | undefined) {
  return user?.roles.some((role) => role.trim().toUpperCase() === "ANALISTA") ?? false;
}
