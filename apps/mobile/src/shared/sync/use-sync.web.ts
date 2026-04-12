export function useSync() {
  return {
    runSync: async () => undefined,
    lastSyncTime: null,
    syncCounts: {
      pendingCount: 0,
      errorCount: 0
    }
  };
}
