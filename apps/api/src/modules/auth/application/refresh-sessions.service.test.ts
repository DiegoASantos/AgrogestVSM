import { describe, expect, it, vi } from "vitest";

import { RefreshSessionsService } from "./refresh-sessions.service";

function buildService() {
  const repository = {
    create: vi.fn((value) => value),
    query: vi.fn(),
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
        tokenHash:
          "3b7bef4289af3728d9c1c6d5cd3362b289a5c7cd258cad35194b3eb188ae7d53"
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
      nextRefreshToken: "next-token",
      nextExpiresAt: new Date("2026-06-30T00:00:00.000Z")
    });

    expect(rotated).toBe(false);
    expect(repository.update).toHaveBeenCalledTimes(2);
  });
});
