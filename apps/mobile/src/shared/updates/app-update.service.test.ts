import { describe, expect, it, vi } from "vitest";

vi.mock("expo-updates", () => ({
  isEnabled: false,
  checkForUpdateAsync: vi.fn(),
  fetchUpdateAsync: vi.fn(),
  reloadAsync: vi.fn()
}));

import { createAppUpdateService } from "./app-update.service";

function createClient({
  isAvailable = false,
  isEnabled = true,
  isNew = false,
  isRollBackToEmbedded = false
} = {}) {
  return {
    isEnabled,
    checkForUpdateAsync: vi.fn(async () => ({
      isAvailable,
      isRollBackToEmbedded
    })),
    fetchUpdateAsync: vi.fn(async () => ({
      isNew,
      isRollBackToEmbedded
    })),
    reloadAsync: vi.fn(async () => undefined)
  };
}

describe("appUpdateService", () => {
  it("does not check for updates when expo-updates is disabled", async () => {
    const client = createClient({ isEnabled: false });
    const service = createAppUpdateService(client);

    await expect(service.prepare()).resolves.toBe("disabled");
    expect(client.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(client.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("does not download when there is no compatible update", async () => {
    const client = createClient();
    const service = createAppUpdateService(client);

    await expect(service.prepare()).resolves.toBe("not_available");
    expect(client.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("downloads an available update and marks it ready", async () => {
    const client = createClient({ isAvailable: true, isNew: true });
    const service = createAppUpdateService(client);

    await expect(service.prepare()).resolves.toBe("ready");
    expect(client.fetchUpdateAsync).toHaveBeenCalledOnce();
  });

  it("prepares a rollback to the embedded update", async () => {
    const client = createClient({ isRollBackToEmbedded: true });
    const service = createAppUpdateService(client);

    await expect(service.prepare()).resolves.toBe("ready");
    expect(client.fetchUpdateAsync).toHaveBeenCalledOnce();
  });

  it("reloads only when expo-updates is enabled", async () => {
    const enabledClient = createClient();
    const disabledClient = createClient({ isEnabled: false });

    await expect(
      createAppUpdateService(enabledClient).applyDownloadedUpdate()
    ).resolves.toBe(true);
    await expect(
      createAppUpdateService(disabledClient).applyDownloadedUpdate()
    ).resolves.toBe(false);
    expect(enabledClient.reloadAsync).toHaveBeenCalledOnce();
    expect(disabledClient.reloadAsync).not.toHaveBeenCalled();
  });
});
