export type SyncRunStatus =
  | "success"
  | "partial"
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
  remainingPending: number;
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
      | "remainingPending"
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
    unattempted: counts.unattempted ?? 0,
    remainingPending: counts.remainingPending ?? 0
  };
}

type CompletedOutboxCounts = Pick<
  SyncRunResult,
  | "processed"
  | "skipped"
  | "errors"
  | "transientFailures"
  | "permanentFailures"
  | "dependencySkipped"
  | "unattempted"
>;

type SyncCycleState = {
  stoppedByAuth: boolean;
  stoppedByConnectivity: boolean;
  aborted: boolean;
  errors: number;
};

type PersistedSyncCounts = {
  pendingCount: number;
  errorCount: number;
};

export function isSyncCycleComplete(
  result: SyncCycleState,
  counts: PersistedSyncCounts
): boolean {
  return (
    !result.stoppedByAuth &&
    !result.stoppedByConnectivity &&
    !result.aborted &&
    result.errors === 0 &&
    counts.pendingCount === 0 &&
    counts.errorCount === 0
  );
}

export function createCompletedOutboxSyncResult(
  counts: CompletedOutboxCounts,
  persistedCounts: PersistedSyncCounts
): SyncRunResult {
  const { errorCount, pendingCount } = persistedCounts;

  if (counts.errors > 0 || errorCount > 0) {
    return createSyncRunResult(
      "failed",
      counts.errors > 0
        ? "La sincronizacion termino con errores en algunos registros."
        : `Hay ${errorCount} registro${errorCount === 1 ? "" : "s"} con error que requiere${errorCount === 1 ? "" : "n"} revision.`,
      { ...counts, remainingPending: pendingCount }
    );
  }

  if (pendingCount > 0) {
    const blockedMessage =
      counts.dependencySkipped > 0
        ? ` ${counts.dependencySkipped} bloqueados por dependencias.`
        : "";
    return createSyncRunResult(
      "partial",
      `Sincronizacion parcial: ${counts.processed} enviados; quedan ${pendingCount} pendientes.${blockedMessage}`,
      { ...counts, remainingPending: pendingCount }
    );
  }

  return createSyncRunResult(
    "success",
    counts.processed > 0
      ? "Datos sincronizados correctamente."
      : "No habia datos nuevos para sincronizar.",
    { ...counts, remainingPending: pendingCount }
  );
}
