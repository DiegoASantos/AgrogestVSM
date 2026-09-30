import { describe, expect, it, vi } from "vitest";

import { RefreshSessionsService } from "./refresh-sessions.service";

function buildService() {
  const repository = {
    create: vi.fn((value) => value),
    query: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn()
  };
  const service = new RefreshSessionsService(repository as never);

  return { repository, service };
}

describe("RefreshSessionsService", () => {
  it("creates its additive database schema", async () => {
    const { repository, service } = buildService();

    await service.onModuleInit();

    expect(repository.query).toHaveBeenCalledTimes(3);
  });

  it("stores a hash instead of the raw refresh token", async () => {
    const { repository, service } = buildService();

    await service.create(
      "session-id",
      "00000000-0000-0000-0000-000000000001",
      "sensitive-refresh-token",
      new Date("2026-06-30T00:00:00.000Z")
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "3b7bef4289af3728d9c1c6d5cd3362b289a5c7cd258cad35194b3eb188ae7d53"
      })
    );
  });

  it("revokes the session when rotation cannot consume the current token", async () => {
    const { repository, service } = buildService();
    repository.update
      .mockResolvedValueOnce({ affected: 0 })
      .mockResolvedValueOnce({ affected: 1 });

    const rotated = await service.rotate({
      id: "session-id",
      userPublicId: "00000000-0000-0000-0000-000000000001",
      currentRefreshToken: "already-used-token",
      nextRefreshToken: "next-token"
    });

    expect(rotated).toBe(false);
    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it("keeps the original expiry when rotating the refresh token", async () => {
    const { repository, service } = buildService();
    repository.update.mockResolvedValue({ affected: 1 });

    await service.rotate({
      id: "session-id",
      userPublicId: "00000000-0000-0000-0000-000000000001",
      currentRefreshToken: "old-token",
      nextRefreshToken: "new-token"
    });

    expect(repository.update.mock.calls[0][1]).not.toHaveProperty("expiresAt");
  });

  it("reads the fixed expiry only for the current stored refresh token", async () => {
    const { repository, service } = buildService();
    const expiresAt = new Date("2027-02-27T00:00:00.000Z");
    repository.findOne.mockResolvedValue({ expiresAt });

    const result = await service.getActiveExpiry({
      id: "session-id",
      userPublicId: "00000000-0000-0000-0000-000000000001",
      refreshToken: "sensitive-refresh-token"
    });

    expect(result).toEqual(expiresAt);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "session-id",
        tokenHash: "3b7bef4289af3728d9c1c6d5cd3362b289a5c7cd258cad35194b3eb188ae7d53"
      })
    });
  });
});
