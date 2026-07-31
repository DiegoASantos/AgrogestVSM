import { toApiError } from "../../../shared/services/api/errors";
import type { AuthUser } from "../types/auth.types";

export const MOBILE_ANALYST_ACCESS_DENIED_MESSAGE =
  "El rol ANALISTA solo esta habilitado para el panel web.";

export type RefreshFailureDisposition = "transient" | "reauth_required";

export function classifyRefreshFailure(error: unknown): RefreshFailureDisposition {
  const statusCode = toApiError(error).statusCode;

  return statusCode === 401 || statusCode === 403
    ? "reauth_required"
    : "transient";
}

export function isRefreshCooldownActive(cooldownUntil: number, now = Date.now()) {
  return Number.isFinite(cooldownUntil) && now < cooldownUntil;
}

export function isAnalystUser(user: Pick<AuthUser, "roles"> | null | undefined) {
  return user?.roles.some((role) => role.trim().toUpperCase() === "ANALISTA") ?? false;
}
