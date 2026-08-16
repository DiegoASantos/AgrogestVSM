import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  withTransactionSync: vi.fn((callback: () => void) => callback())
}));
const insertSyncOutboxEntry = vi.hoisted(() => vi.fn());

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));
vi.mock("../../../shared/database/sync-outbox", () => ({
  insertSyncOutboxEntry
}));

import { productoresRepository } from "../../productores/repositories/productores.repository";
import { parcelasRepository } from "../repositories/parcelas.repository";
import { parcelasService } from "./parcelas.service";

describe("parcelasService.activateForVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates the parcela and productor and enqueues the parcela update", async () => {
    vi.spyOn(parcelasRepository, "getById").mockReturnValue({
      id: "parcela-1",
      productorId: "productor-1",
      isActive: false,
      syncStatus: "synced"
    } as never);
    const updateParcela = vi
      .spyOn(parcelasRepository, "update")
      .mockImplementation(() => {});
    const updateProductor = vi
      .spyOn(productoresRepository, "update")
      .mockImplementation(() => {});

    const result = await parcelasService.activateForVisit("parcela-1");

    expect(updateParcela).toHaveBeenCalledWith("parcela-1", {
      isActive: true,
      syncStatus: "pending",
      syncErrorMessage: null
    });
    expect(updateProductor).toHaveBeenCalledWith("productor-1", {
      isActive: true
    });
    expect(insertSyncOutboxEntry).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        entityType: "parcelas",
        entityLocalId: "parcela-1",
        operation: "update"
      })
    );
    expect(result.isActive).toBe(true);
    expect(result.syncStatus).toBe("pending");
  });

  it("does not enqueue an update when the parcela is already active", async () => {
    const activeParcela = {
      id: "parcela-1",
      productorId: "productor-1",
      isActive: true,
      syncStatus: "synced"
    };
    vi.spyOn(parcelasRepository, "getById").mockReturnValue(activeParcela as never);

    const result = await parcelasService.activateForVisit("parcela-1");

    expect(result).toBe(activeParcela);
    expect(insertSyncOutboxEntry).not.toHaveBeenCalled();
  });
});
