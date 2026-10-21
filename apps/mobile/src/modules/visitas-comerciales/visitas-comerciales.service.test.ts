import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const deleteFailure = vi.fn();
const runSync = vi.fn();
const getFirstSync = vi.fn();
const getAllSync = vi.fn();
const withTransactionSync = vi.fn((callback: () => void) => callback());
vi.mock("../../shared/database/connection", () => ({
  getDatabase: () => ({ runSync, getFirstSync, getAllSync, withTransactionSync })
}));
vi.mock("../../shared/database/catalog-session", () => ({
  getCatalogSessionUserId: () => "user-7"
}));
vi.mock("../../shared/database/sync-outbox", () => ({
  insertSyncOutboxEntry: (...args: unknown[]) => insert(...args)
}));
vi.mock("../../shared/database/sync-failures", () => ({
  deleteSyncFailureForEntity: (...args: unknown[]) => deleteFailure(...args)
}));
vi.mock("../../shared/database/sqlite-utils", () => ({
  getNowIsoString: () => "2026-10-17T10:00:00.000Z"
}));
vi.mock("../../shared/utils/local-id", () => ({
  generateLocalId: () => "local-1",
  generatePublicId: () => "11111111-1111-4111-8111-111111111111"
}));
vi.mock("../../shared/services", () => ({ apiRequest: vi.fn() }));

import { visitasComercialesService } from "./visitas-comerciales.service";

describe("visitasComercialesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const visitRow = {
      local_id: "local-1",
      public_id: "11111111-1111-4111-8111-111111111111",
      server_id: null,
      tipo_sujeto: "PERSONA",
      nombres: "Ana",
      apellidos: "López",
      descripcion: "Visita",
      fecha_visita: "2026-10-17",
      ubicacion_visita: null,
      sync_status: "pending",
      sync_error_message: null
    };
    getFirstSync.mockImplementation((sql: string) =>
      sql.includes("SELECT entity_type FROM productores")
        ? { entity_type: "persona" }
        : visitRow
    );
  });

  it("persists a visit without GPS and queues exactly one root operation", () => {
    const visit = visitasComercialesService.create({
      productorId: "producer-1",
      tipoSujeto: "PERSONA",
      nombres: "Ana",
      apellidos: "López",
      descripcion: "Visita",
      fechaVisita: "2026-10-17",
      ubicacionVisita: null
    });
    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO visitas_comerciales"),
      "local-1",
      "11111111-1111-4111-8111-111111111111",
      "user-7",
      "PERSONA",
      "producer-1",
      "Ana",
      "López",
      "Visita",
      "2026-10-17",
      null,
      "2026-10-17T10:00:00.000Z",
      "2026-10-17T10:00:00.000Z"
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][1]).toMatchObject({
      entityType: "visitas_comerciales",
      entityLocalId: "local-1",
      operation: "create"
    });
    expect(visit.syncStatus).toBe("pending");
  });

  it("requires last names for person and recorredor", () => {
    for (const tipoSujeto of ["PERSONA", "RECORREDOR"] as const) {
      expect(() =>
        visitasComercialesService.create({
          tipoSujeto,
          nombres: "Ana",
          descripcion: "Visita",
          fechaVisita: "2026-10-17"
        })
      ).toThrow("apellidos");
    }
    expect(runSync).not.toHaveBeenCalled();
  });

  it("requires an owned producer for a new visit", () => {
    expect(() => visitasComercialesService.create({
      tipoSujeto: "FUNDO", nombres: "Fundo", descripcion: "Visita", fechaVisita: "2026-10-17"
    })).toThrow("Selecciona un productor");
    getFirstSync.mockImplementation((sql: string) =>
      sql.includes("SELECT entity_type FROM productores") ? null : { local_id: "local-1" });
    expect(() => visitasComercialesService.create({
      productorId: "producer-2", tipoSujeto: "FUNDO", nombres: "Fundo",
      descripcion: "Visita", fechaVisita: "2026-10-17"
    })).toThrow("no esta disponible");
    expect(runSync).not.toHaveBeenCalled();
  });

  it("marks a synced visit without changing its public ID", () => {
    visitasComercialesService.markSynced("local-1", "42");
    expect(runSync).toHaveBeenCalledWith(
      expect.stringContaining("sync_status = 'synced'"),
      "42",
      "local-1"
    );
  });

  it("requeues a failed visit with its original local and public IDs", () => {
    getFirstSync.mockReturnValue({ ...getFirstSync("SELECT * FROM visitas_comerciales"), sync_status: "error" });
    expect(visitasComercialesService.retry("local-1")).toBe(true);
    expect(deleteFailure).toHaveBeenCalledWith(
      expect.anything(),
      "visitas_comerciales",
      "local-1"
    );
    expect(insert.mock.calls[0][1]).toMatchObject({
      entityType: "visitas_comerciales",
      entityLocalId: "local-1",
      operation: "create"
    });
  });
});
