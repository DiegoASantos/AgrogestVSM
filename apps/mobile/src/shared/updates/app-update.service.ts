import * as Updates from "expo-updates";

export type AppUpdatePreparationResult = "disabled" | "not_available" | "ready";

type AppUpdateClient = {
  readonly isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{
    isAvailable: boolean;
    isRollBackToEmbedded: boolean;
  }>;
  fetchUpdateAsync: () => Promise<{
    isNew: boolean;
    isRollBackToEmbedded: boolean;
  }>;
  reloadAsync: () => Promise<void>;
};

export function createAppUpdateService(client: AppUpdateClient) {
  return {
    async prepare(): Promise<AppUpdatePreparationResult> {
      if (!client.isEnabled) {
        return "disabled";
      }

      const checkResult = await client.checkForUpdateAsync();

      if (!checkResult.isAvailable && !checkResult.isRollBackToEmbedded) {
        return "not_available";
      }

      const fetchResult = await client.fetchUpdateAsync();

      return fetchResult.isNew || fetchResult.isRollBackToEmbedded
        ? "ready"
        : "not_available";
    },

    async applyDownloadedUpdate(): Promise<boolean> {
      if (!client.isEnabled) {
        return false;
      }

      await client.reloadAsync();
      return true;
    }
  };
}

const expoUpdatesClient: AppUpdateClient = {
  get isEnabled() {
    return Updates.isEnabled;
  },
  checkForUpdateAsync: () => Updates.checkForUpdateAsync(),
  fetchUpdateAsync: () => Updates.fetchUpdateAsync(),
  reloadAsync: () => Updates.reloadAsync()
};

export const appUpdateService = createAppUpdateService(expoUpdatesClient);
