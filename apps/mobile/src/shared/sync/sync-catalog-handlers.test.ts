import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../database/connection", () => ({
  getDatabase: vi.fn()
}));

vi.mock("../services", () => ({
  apiRequest: vi.fn(),
  apiRequestAllPages: vi.fn()
}));

vi.mock("../services/api/auth-store", () => ({
  getApiToken: () => "test-token"
}));

vi.mock("../utils/local-id", () => ({
  generatePublicId: () => "00000000-0000-4000-8000-000000000001",
  isUuid: () => true
}));

import { parcelasRepository } from "../../modules/parcelas/repositories/parcelas.repository";
import { parcelasRemote } from "../../modules/parcelas/services/parcelas.remote";
import { productoresRepository } from "../../modules/productores/repositories/productores.repository";
import { productoresRemote } from "../../modules/productores/services/productores.remote";
import { sectoresRepository } from "../../modules/sectores/repositories/sectores.repository";
import { subsectoresRepository } from "../../modules/subsectores/repositories/subsectores.repository";
import { subsectoresRemote } from "../../modules/subsectores/services/subsectores.remote";
import type { SyncOutboxItem } from "../database/sync-outbox";
import {
  handleParcela,
  handleProductor,
  handleSubsector
} from "./sync-handlers";

function makeEntry(overrides: Partial<SyncOutboxItem> = {}): SyncOutboxItem {
  return {
    id: 1,
    entityType: "productores",
    entityLocalId: "local-1",
    operation: "create",
    payload: null,
    retryCount: 0,
    createdAt: "2026-08-02T10:00:00.000Z",
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog sync handlers", () => {
  it("creates a productor, propagates cancellation context and stores its server id", async () => {
    const signal = new AbortController().signal;
    vi.spyOn(productoresRepository, "getById").mockReturnValue({
      id: "local-1",
      entityType: "persona",
      firstName: "Ana",
      lastName: "Perez",
      documentTypeId: 1,
      documentNumber: "12345678",
      phone: null,
      email: null,
      address: null,
      serverId: null
    } as never);
    const create = vi.spyOn(productoresRemote, "create").mockResolvedValue({
      id: "101"
    } as never);
    const update = vi.spyOn(productoresRepository, "update").mockImplementation(() => {});

    const result = await handleProductor(makeEntry(), { signal });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "persona",
        firstName: "Ana",
        documentNumber: "12345678"
      }),
      { signal }
    );
    expect(update).toHaveBeenCalledWith("local-1", {
      serverId: "101",
      syncStatus: "synced",
      syncErrorMessage: null
    });
    expect(result).toEqual({ status: "synced", serverId: "101" });
  });

  it("skips a subsector while its sector has no server id", async () => {
    vi.spyOn(subsectoresRepository, "getById").mockReturnValue({
      id: "sub-local",
      sectorId: "sector-local",
      serverId: null
    } as never);
    vi.spyOn(sectoresRepository, "getById").mockReturnValue({
      id: "sector-local",
      serverId: null
    } as never);
    const create = vi.spyOn(subsectoresRemote, "create");

    const result = await handleSubsector(
      makeEntry({ entityType: "subsectores", entityLocalId: "sub-local" })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped" });
  });

  it("resolves parent server ids before creating a parcela", async () => {
    const point = { type: "Point" as const, coordinates: [-80.6, -5.2] };
    vi.spyOn(parcelasRepository, "getById").mockReturnValue({
      id: "parcela-local",
      productorId: "productor-local",
      subsectorId: "subsector-local",
      serverId: null,
      name: "",
      areaHectares: null,
      description: null,
      referencePoint: point
    } as never);
    vi.spyOn(productoresRepository, "getById").mockReturnValue({
      id: "productor-local",
      serverId: "201"
    } as never);
    vi.spyOn(subsectoresRepository, "getById").mockReturnValue({
      id: "subsector-local",
      serverId: "301"
    } as never);
    const create = vi.spyOn(parcelasRemote, "create").mockResolvedValue({
      id: "401",
      publicId: "public-401",
      code: "PAR-401"
    } as never);
    const update = vi.spyOn(parcelasRepository, "update").mockImplementation(() => {});

    const result = await handleParcela(
      makeEntry({ entityType: "parcelas", entityLocalId: "parcela-local" })
    );

    expect(create).toHaveBeenCalledWith(
      {
        productorId: "201",
        subsectorId: "301",
        name: null,
        areaHectares: null,
        description: null,
        referencePoint: point
      },
      {}
    );
    expect(update).toHaveBeenCalledWith(
      "parcela-local",
      expect.objectContaining({
        serverId: "401",
        code: "PAR-401",
        publicId: "public-401",
        syncStatus: "synced"
      })
    );
    expect(result).toEqual({ status: "synced", serverId: "401" });
  });

  it("uses the delete payload after the local productor row was removed", async () => {
    const remove = vi.spyOn(productoresRemote, "remove").mockResolvedValue({} as never);

    const result = await handleProductor(
      makeEntry({
        operation: "delete",
        payload: JSON.stringify({ serverId: "501" })
      })
    );

    expect(remove).toHaveBeenCalledWith("501", {});
    expect(result).toEqual({ status: "synced", serverId: "501" });
  });
});
