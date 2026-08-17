import { beforeEach, describe, expect, it, vi } from "vitest";

const getById = vi.hoisted(() => vi.fn());
const deleteLocalAggregateById = vi.hoisted(() => vi.fn());
const removeRemote = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({}));

vi.mock("../repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {
    getById,
    deleteLocalAggregateById
  }
}));
vi.mock("./visitas-campo.remote", () => ({
  visitasCampoRemote: { remove: removeRemote }
}));
vi.mock("../../../shared/sync/sync-mutation-lock", () => ({
  runWithSyncMutationLock: (work: () => Promise<unknown>) => work()
}));

import { visitaDeletionService } from "./visita-deletion.service";

const baseOptions = {
  canDeleteVisits: true,
  currentUserId: "user-1",
  ensureOnlineSession: vi.fn().mockResolvedValue("valid" as const),
  isOnline: true
};

function makeVisit(serverId: string | null) {
  return {
    id: "visit-1",
    serverId,
    agronomistUserId: "user-1"
  };
}

describe("visitaDeletionService.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseOptions.ensureOnlineSession.mockResolvedValue("valid");
  });

  it("deletes an unsynced draft locally without a network request", async () => {
    getById.mockReturnValue(makeVisit(null));

    await visitaDeletionService.remove("visit-1", {
      ...baseOptions,
      isOnline: false
    });

    expect(removeRemote).not.toHaveBeenCalled();
    expect(deleteLocalAggregateById).toHaveBeenCalledWith("visit-1");
  });

  it("deactivates a synced visit remotely before deleting it locally", async () => {
    getById.mockReturnValue(makeVisit("server-1"));
    removeRemote.mockResolvedValue({ id: "server-1", isActive: false });

    await visitaDeletionService.remove("visit-1", baseOptions);

    expect(removeRemote).toHaveBeenCalledWith("server-1");
    expect(removeRemote.mock.invocationCallOrder[0]).toBeLessThan(
      deleteLocalAggregateById.mock.invocationCallOrder[0]
    );
  });

  it("keeps local data when the remote deletion fails", async () => {
    getById.mockReturnValue(makeVisit("server-1"));
    removeRemote.mockRejectedValue(new Error("Forbidden"));

    await expect(visitaDeletionService.remove("visit-1", baseOptions)).rejects.toThrow(
      "Forbidden"
    );

    expect(deleteLocalAggregateById).not.toHaveBeenCalled();
  });

  it("requires connectivity for a synced visit", async () => {
    getById.mockReturnValue(makeVisit("server-1"));

    await expect(
      visitaDeletionService.remove("visit-1", { ...baseOptions, isOnline: false })
    ).rejects.toThrow("Conectate a internet");

    expect(removeRemote).not.toHaveBeenCalled();
    expect(deleteLocalAggregateById).not.toHaveBeenCalled();
  });

  it("rejects a different owner before any mutation", async () => {
    getById.mockReturnValue({
      ...makeVisit(null),
      agronomistUserId: "user-2"
    });

    await expect(visitaDeletionService.remove("visit-1", baseOptions)).rejects.toThrow(
      "No se encontro"
    );

    expect(removeRemote).not.toHaveBeenCalled();
    expect(deleteLocalAggregateById).not.toHaveBeenCalled();
  });

  it("rejects a session without the cached permission", async () => {
    getById.mockReturnValue(makeVisit(null));

    await expect(
      visitaDeletionService.remove("visit-1", {
        ...baseOptions,
        canDeleteVisits: false
      })
    ).rejects.toThrow("No tiene permiso");

    expect(getById).not.toHaveBeenCalled();
    expect(deleteLocalAggregateById).not.toHaveBeenCalled();
  });
});
