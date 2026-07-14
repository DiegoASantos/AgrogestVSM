import { toApiError } from "../../../shared/services/api/errors";

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
