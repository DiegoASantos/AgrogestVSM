import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getCatalogSessionUserId: vi.fn(),
  forceRefreshAllCatalogs: vi.fn(),
  apiRequest: vi.fn(),
  getFirstSync: vi.fn(),
  getAllSync: vi.fn(),
  runSync: vi.fn(),
  withTransactionSync: vi.fn((callback: () => void) => callback())
}));

vi.mock("../../../shared/database/connection", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../../../shared/database/catalog-session", () => ({ getCatalogSessionUserId: mocks.getCatalogSessionUserId }));
vi.mock("../../../shared/database/seed-catalogs", () => ({ forceRefreshAllCatalogs: mocks.forceRefreshAllCatalogs }));
vi.mock("../../../shared/services/api/client", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "uuid-test" }));

import { mobileRecoveryService } from "./mobile-recovery.service";
import { ApiError } from "../../../shared/services/api/errors";

describe("mobileRecoveryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCatalogSessionUserId.mockReturnValue("user-1");
    mocks.getFirstSync.mockImplementation((_sql: string, key: string) =>
      key === "mobile_recovery_v1:cursor:user-1" ? null : null
    );
    mocks.getAllSync.mockReturnValue([]);
    mocks.getDatabase.mockReturnValue({
      getFirstSync: mocks.getFirstSync,
      getAllSync: mocks.getAllSync,
      runSync: mocks.runSync,
      withTransactionSync: mocks.withTransactionSync
    });
    mocks.apiRequest.mockResolvedValue({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: { visita_tecnica: 0 }, snapshot: "2026-10-30T00:00:00.000Z", items: [], nextCursor: null
    });
  });

  it("refreshes catalogs before the first request and commits completion with the page", async () => {
    const result = await mobileRecoveryService.recoverPage("user-1");
    expect(mocks.forceRefreshAllCatalogs).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledWith("/mobile/recuperacion", { timeoutMs: 60_000 });
    expect(mocks.withTransactionSync).toHaveBeenCalledOnce();
    expect(mocks.runSync).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
      "mobile_recovery_v1:cursor:user-1", "__complete__"
    );
    expect(result).toEqual({ recovered: 0, counts: { visita_tecnica: 0 }, completed: true });
  });

  it("does not advance the cursor when the API fails", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("red no disponible"));
    await expect(mobileRecoveryService.recoverPage("user-1")).rejects.toThrow("red no disponible");
    expect(mocks.withTransactionSync).not.toHaveBeenCalled();
    expect(mocks.runSync).not.toHaveBeenCalled();
  });

  it("imports a server-confirmed commercial visit as synced without creating outbox work", async () => {
    mocks.getFirstSync.mockImplementation((sql: string) =>
      sql.includes("SELECT id FROM productores") ? { id: "producer-local" } : null
    );
    mocks.apiRequest.mockResolvedValue({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: { visita_comercial: 1 }, snapshot: "2026-10-30T00:00:00.000Z",
      items: [{ type: "visita_comercial", id: "remote-visit", data: {
        publicId: "public-visit", productorId: "producer-remote", tipoSujeto: "PERSONA", nombres: "Ana",
        apellidos: "Rios", descripcion: "Seguimiento", fechaVisita: "2026-10-20", ubicacionVisita: null
      } }], nextCursor: null
    });
    await mobileRecoveryService.recoverPage("user-1");
    const insert = mocks.runSync.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO visitas_comerciales"));
    expect(insert).toBeTruthy();
    expect(String(insert?.[0])).toContain("'synced'");
    expect(mocks.runSync.mock.calls.some(([sql]) => String(sql).includes("sync_outbox"))).toBe(false);
  });

  it("keeps recovery progress isolated to the authenticated local account", async () => {
    mocks.getCatalogSessionUserId.mockReturnValue("user-2");
    await expect(mobileRecoveryService.recoverPage("user-1")).rejects.toThrow("La sesión local cambió");
    expect(mocks.apiRequest).not.toHaveBeenCalled();
    expect(mocks.forceRefreshAllCatalogs).not.toHaveBeenCalled();
  });

  it("uses the saved account cursor to resume without refreshing catalogs again", async () => {
    mocks.getFirstSync.mockImplementation((_sql: string, key: string) =>
      key === "mobile_recovery_v1:cursor:user-1" ? { value: "opaque-cursor" } : null
    );
    mocks.apiRequest.mockResolvedValue({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: {}, snapshot: "2026-10-30T00:00:00.000Z", items: [], nextCursor: "next-cursor"
    });
    await mobileRecoveryService.recoverPage("user-1");
    expect(mocks.getFirstSync).toHaveBeenCalledWith("SELECT value FROM app_meta WHERE key = ?", "mobile_recovery_v1:cursor:user-1");
    expect(mocks.forceRefreshAllCatalogs).not.toHaveBeenCalled();
    expect(mocks.apiRequest).toHaveBeenCalledWith("/mobile/recuperacion?cursor=opaque-cursor", { timeoutMs: 60_000 });
  });

  it("restarts from a clean snapshot if a saved server cursor expires", async () => {
    mocks.getFirstSync.mockImplementation((_sql: string, key: string) =>
      key === "mobile_recovery_v1:cursor:user-1" ? { value: "expired-cursor" } : null
    );
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiError("cursor inválido", 400))
      .mockResolvedValueOnce({
        window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
        counts: {}, snapshot: "2026-10-30T00:00:00.000Z", items: [], nextCursor: null
      });
    await mobileRecoveryService.recoverPage("user-1");
    expect(mocks.runSync).toHaveBeenCalledWith("DELETE FROM app_meta WHERE key = ?", "mobile_recovery_v1:cursor:user-1");
    expect(mocks.apiRequest).toHaveBeenNthCalledWith(2, "/mobile/recuperacion", { timeoutMs: 60_000 });
  });
});
