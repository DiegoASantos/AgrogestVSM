import { beforeEach, describe, expect, it, vi } from "vitest";

const getFirstSync = vi.fn();
const getAllSync = vi.fn();

vi.mock("../database/connection", () => ({
  getDatabase: () => ({ getFirstSync, getAllSync, runSync: vi.fn() })
}));

vi.mock("../database/catalog-status", () => ({
  getCatalogsDownloadedAt: () => null
}));

vi.mock("../database/sync-failures", () => ({
  getSyncFailures: () => []
}));

vi.mock("./sync-events", () => ({
  notifySyncStatusChanged: vi.fn(),
  subscribeToSyncStatus: vi.fn()
}));

const { getSyncCounts, getSyncErrorDetails } = await import("./sync-status");

beforeEach(() => {
  getFirstSync.mockReset();
  getAllSync.mockReset();
  getFirstSync.mockImplementation((statement: string) => {
    if (statement.includes("FROM app_meta")) {
      return { value: "agronomo-1" };
    }
    if (statement.includes("FROM sync_outbox")) {
      return { count: 0 };
    }
    if (statement.includes("FROM sync_failures") && !statement.includes("NOT EXISTS")) {
      return { count: 0 };
    }
    return { error: 0 };
  });
  getAllSync.mockImplementation((statement: string) =>
    statement.startsWith("PRAGMA table_info")
      ? [{ name: "sync_error_message" }, { name: "updated_at" }]
      : []
  );
});

describe("sync status catalog identifiers", () => {
  it("counts catalog errors using id and visit errors using local_id", () => {
    expect(() => getSyncCounts()).not.toThrow();

    const statements = getFirstSync.mock.calls.map(([statement]) => String(statement));
    expect(statements).toContainEqual(expect.stringContaining("productores.id"));
    expect(statements).toContainEqual(expect.stringContaining("sectores.id"));
    expect(statements).toContainEqual(expect.stringContaining("subsectores.id"));
    expect(statements).toContainEqual(expect.stringContaining("parcelas.id"));
    expect(statements).toContainEqual(expect.stringContaining("visitas_campo.local_id"));
    expect(
      statements.some((statement) => statement.includes("productores.local_id"))
    ).toBe(false);
  });

  it("loads catalog errors when catalog tables have no local_id or updated_at", () => {
    getAllSync.mockImplementation((statement: string) => {
      if (statement.startsWith("PRAGMA table_info")) {
        if (
          statement.includes("ingredientes_activos") ||
          statement.includes("fertilizantes") ||
          statement.includes("marcas_producto")
        ) {
          return [{ name: "sync_error_message" }];
        }

        return [{ name: "sync_error_message" }, { name: "updated_at" }];
      }

      if (statement.includes("FROM ingredientes_activos")) {
        return [
          {
            local_id: "ingrediente-1",
            sync_error_message: "Error de catálogo",
            updated_at: null
          }
        ];
      }

      if (statement.includes("FROM visitas_campo")) {
        return [
          {
            local_id: "visita-1",
            sync_error_message: "Error de visita",
            updated_at: "2026-08-03T12:00:00.000Z"
          }
        ];
      }

      return [];
    });

    const details = getSyncErrorDetails();

    const statements = getAllSync.mock.calls.map(([statement]) => String(statement));
    expect(statements).toContainEqual(expect.stringContaining("id AS local_id"));
    expect(statements).toContainEqual(expect.stringContaining("local_id AS local_id"));
    expect(
      statements.some((statement) => statement.includes("productores.local_id"))
    ).toBe(false);
    const ingredientesQuery = statements.find((statement) =>
      statement.includes("FROM ingredientes_activos")
    );
    const visitasQuery = statements.find((statement) =>
      statement.includes("FROM visitas_campo")
    );

    expect(ingredientesQuery).toContain("NULL AS updated_at");
    expect(ingredientesQuery).not.toContain("ORDER BY updated_at DESC");
    expect(visitasQuery).toContain("visitas_campo.updated_at AS updated_at");
    expect(visitasQuery).toContain("ORDER BY visitas_campo.updated_at DESC");
    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "ingredientes_activos",
          localId: "ingrediente-1",
          updatedAt: null
        }),
        expect.objectContaining({
          entityType: "visitas_campo",
          localId: "visita-1",
          updatedAt: "2026-08-03T12:00:00.000Z"
        })
      ])
    );
  });
});
