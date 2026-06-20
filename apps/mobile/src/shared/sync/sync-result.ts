export type SyncRunStatus =
  | "success"
  | "offline"
  | "unauthenticated"
  | "auth_failed"
  | "already_running"
  | "failed";

export type SyncRunResult = {
  status: SyncRunStatus;
  message: string;
  attemptedAt: string;
  processed: number;
  skipped: number;
  errors: number;
};

export function createSyncRunResult(
  status: SyncRunStatus,
  message: string,
  counts: Partial<Pick<SyncRunResult, "processed" | "skipped" | "errors">> = {}
): SyncRunResult {
  return {
    status,
    message,
    attemptedAt: new Date().toISOString(),
    processed: counts.processed ?? 0,
    skipped: counts.skipped ?? 0,
    errors: counts.errors ?? 0
  };
}
