export type SyncConnectionQuality = "stable" | "unstable" | "none";

export type SyncAttemptRecord = {
  success: boolean;
  attemptedAt: string;
  durationMs?: number;
};

export type SyncManagerState = {
  window: SyncAttemptRecord[];
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  backoffStep: number;
  lastAttemptAt: string | null;
  updatedAt: string;
};

export type SyncManagerStateStore = {
  load: () => SyncManagerState | null;
  save: (state: SyncManagerState) => void;
};

export type SyncManagerConfig = {
  windowSize: number;
  stableSuccessRate: number;
  severeFailureSuccessRate: number;
  recoverySuccesses: number;
  backoffIntervalsMs: readonly number[];
  severeMinimumBackoffMs: number;
};

export const DEFAULT_SYNC_MANAGER_CONFIG: SyncManagerConfig = {
  windowSize: 10,
  stableSuccessRate: 0.7,
  severeFailureSuccessRate: 0.2,
  recoverySuccesses: 3,
  backoffIntervalsMs: [10_000, 30_000, 60_000, 120_000],
  severeMinimumBackoffMs: 60_000
};

export const SLOW_NETWORK_REQUEST_MS = 5_000;
export const NETWORK_QUALITY_HISTORY_TTL_MS = 5 * 60_000;
const MIN_QUALITY_OBSERVATIONS = 3;
const FAILURES_TO_DEGRADE = 2;

export class SyncManager {
  constructor(
    private readonly store: SyncManagerStateStore,
    private readonly config: SyncManagerConfig = DEFAULT_SYNC_MANAGER_CONFIG,
    private readonly now: () => Date = () => new Date()
  ) {}

  getState(): SyncManagerState {
    const state = this.store.load();

    if (!state || !this.isHistoryFresh(state)) {
      return createInitialSyncManagerState(this.now().toISOString());
    }

    return state;
  }

  evaluateConnection(isOnline: boolean, state = this.getState()): SyncConnectionQuality {
    if (!isOnline) {
      return "none";
    }

    if (state.consecutiveSuccesses >= this.config.recoverySuccesses) {
      return "stable";
    }

    if (state.consecutiveFailures >= FAILURES_TO_DEGRADE) {
      return "unstable";
    }

    if (state.window.length < MIN_QUALITY_OBSERVATIONS) {
      return "stable";
    }

    return this.getSuccessRate(state) >= this.config.stableSuccessRate
      ? "stable"
      : "unstable";
  }

  getSuccessRate(state = this.getState()) {
    if (state.window.length === 0) {
      return 1;
    }

    const successes = state.window.filter((attempt) => attempt.success).length;
    return successes / state.window.length;
  }

  getBackoffIntervalMs(state = this.getState()) {
    if (this.evaluateConnection(true, state) === "stable") {
      return 0;
    }

    const intervals = this.config.backoffIntervalsMs;
    const interval =
      intervals[Math.min(state.backoffStep, intervals.length - 1)] ?? intervals[0] ?? 0;

    if (this.getSuccessRate(state) < this.config.severeFailureSuccessRate) {
      return Math.max(interval, this.config.severeMinimumBackoffMs);
    }

    return interval;
  }

  getDelayUntilNextRunMs(isOnline: boolean, state = this.getState()) {
    if (this.evaluateConnection(isOnline, state) === "none") {
      return null;
    }

    const interval = this.getBackoffIntervalMs(state);

    if (!state.lastAttemptAt || interval === 0) {
      return 0;
    }

    const lastAttemptTime = new Date(state.lastAttemptAt).getTime();

    if (Number.isNaN(lastAttemptTime)) {
      return 0;
    }

    return Math.max(0, interval - (this.now().getTime() - lastAttemptTime));
  }

  recordAttempt(success: boolean, durationMs?: number) {
    return this.recordRecords([
      {
        success,
        attemptedAt: this.now().toISOString(),
        ...(durationMs === undefined ? {} : { durationMs })
      }
    ]);
  }

  recordOutcome(successes: number, failures: number) {
    const normalizedSuccesses = Math.max(0, Math.floor(successes));
    const normalizedFailures = Math.max(0, Math.floor(failures));

    if (normalizedSuccesses === 0 && normalizedFailures === 0) {
      return this.getState();
    }

    const attemptedAt = this.now().toISOString();
    const nextRecords: SyncAttemptRecord[] = [
      ...Array.from({ length: normalizedSuccesses }, () => ({
        success: true,
        attemptedAt
      })),
      ...Array.from({ length: normalizedFailures }, () => ({
        success: false,
        attemptedAt
      }))
    ];
    return this.recordRecords(nextRecords);
  }

  private recordRecords(nextRecords: SyncAttemptRecord[]) {
    if (nextRecords.length === 0) {
      return this.getState();
    }

    const currentState = this.getState();
    const nextWindow = [...currentState.window, ...nextRecords].slice(
      -this.config.windowSize
    );
    const normalizedSuccesses = nextRecords.filter((record) => record.success).length;
    const normalizedFailures = nextRecords.length - normalizedSuccesses;
    const success = normalizedFailures === 0 && normalizedSuccesses > 0;
    const attemptedAt =
      nextRecords[nextRecords.length - 1]?.attemptedAt ?? this.now().toISOString();

    const consecutiveSuccesses = success
      ? currentState.consecutiveSuccesses + normalizedSuccesses
      : 0;
    const consecutiveFailures = success
      ? Math.max(0, currentState.consecutiveFailures - 1)
      : currentState.consecutiveFailures + normalizedFailures;
    const maxBackoffStep = this.config.backoffIntervalsMs.length - 1;
    const wasStable = this.evaluateConnection(true, currentState) === "stable";
    let backoffStep = success
      ? Math.max(0, currentState.backoffStep - 1)
      : wasStable
        ? 0
        : Math.min(maxBackoffStep, currentState.backoffStep + 1);

    if (consecutiveSuccesses >= this.config.recoverySuccesses) {
      backoffStep = 0;
    }

    const nextState: SyncManagerState = {
      window: nextWindow,
      consecutiveFailures:
        consecutiveSuccesses >= this.config.recoverySuccesses ? 0 : consecutiveFailures,
      consecutiveSuccesses,
      backoffStep,
      lastAttemptAt: attemptedAt,
      updatedAt: attemptedAt
    };

    this.store.save(nextState);
    return nextState;
  }

  resetState() {
    const nextState = createInitialSyncManagerState(this.now().toISOString());
    this.store.save(nextState);
    return nextState;
  }

  private isHistoryFresh(state: SyncManagerState) {
    const updatedAt = new Date(state.updatedAt).getTime();

    if (Number.isNaN(updatedAt)) {
      return false;
    }

    return this.now().getTime() - updatedAt < NETWORK_QUALITY_HISTORY_TTL_MS;
  }
}

export function createInitialSyncManagerState(updatedAt: string): SyncManagerState {
  return {
    window: [],
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    backoffStep: 0,
    lastAttemptAt: null,
    updatedAt
  };
}
