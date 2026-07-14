export type SyncRunStatus =
  | "success"
  | "offline"
  | "unauthenticated"
  | "auth_failed"
  | "auth_temporarily_unavailable"
  | "reauth_required"
  | "already_running"
  | "backoff"
  | "timed_out"
  | "failed";

export type SyncRunResult = {
  status: SyncRunStatus;
  message: string;
  attemptedAt: string;
  processed: number;
  skipped: number;
  errors: number;
  transientFailures: number;
  permanentFailures: number;
  dependencySkipped: number;
  unattempted: number;
};

export function createSyncRunResult(
  status: SyncRunStatus,
  message: string,
  counts: Partial<
    Pick<
      SyncRunResult,
      | "processed"
      | "skipped"
      | "errors"
      | "transientFailures"
      | "permanentFailures"
      | "dependencySkipped"
      | "unattempted"
    >
  > = {}
): SyncRunResult {
  return {
    status,
    message,
    attemptedAt: new Date().toISOString(),
    processed: counts.processed ?? 0,
    skipped: counts.skipped ?? 0,
    errors: counts.errors ?? 0,
    transientFailures: counts.transientFailures ?? 0,
    permanentFailures: counts.permanentFailures ?? 0,
    dependencySkipped: counts.dependencySkipped ?? 0,
    unattempted: counts.unattempted ?? 0
  };
}
