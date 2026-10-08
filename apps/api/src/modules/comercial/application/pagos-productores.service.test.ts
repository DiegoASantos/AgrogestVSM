import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DetallePagoProductorEntity } from "../infrastructure/persistence/entities/detalle-pago-productor.entity";
import { PagoProductorEntity } from "../infrastructure/persistence/entities/pago-productor.entity";
import { PagosProductoresService } from "./pagos-productores.service";

const payment = {
  id: "10",
  publicId: "550e8400-e29b-41d4-a716-446655440000",
  productorId: "20",
  status: "BORRADOR",
  harvestDate: "2026-10-01",
  harvestReceptionDate: "2026-10-02"
} as PagoProductorEntity;

function buildService() {
  let persistedDetails: Array<Record<string, unknown>> = [];
  const details = {
    save: vi.fn(async (value: Record<string, unknown>) => {
      persistedDetails.push(value);
      return value;
    }),
    find: vi.fn(async () => persistedDetails),
    findOne: vi.fn(async () => null)
  };
  const payments = { save: vi.fn(async (value: PagoProductorEntity) => value) };
  const manager = {
    getRepository: vi.fn((entity: unknown) => {
      if (entity === DetallePagoProductorEntity) return details;
      if (entity === PagoProductorEntity) return payments;
      throw new Error("Unexpected repository");
    })
  };
  const dataSource = {
    transaction: vi.fn(async (callback: (value: typeof manager) => Promise<unknown>) => {
      const snapshot = [...persistedDetails];
      try {
        return await callback(manager);
      } catch (error) {
        persistedDetails = snapshot;
        throw error;
      }
    })
  };
  const service = new PagosProductoresService(dataSource as never);
  const internal = service as unknown as Record<string, unknown>;
  internal.createPaymentWithinTransaction = vi.fn(async () => ({ ...payment }));
  internal.findPayment = vi.fn(async () => ({ ...payment }));
  internal.toPaymentResponse = vi.fn((value: PagoProductorEntity) => ({
    id: value.publicId
  }));
  internal.toDetailResponseFromRelations = vi.fn(
    (value: Record<string, unknown>) => value
  );
  return {
    service,
    dataSource,
    manager,
    details,
    internal,
    getPersisted: () => persistedDetails
  };
}

describe("PagosProductoresService complete payment", () => {
  it("rejects a complete payment with no active detail", async () => {
    const { service, getPersisted } = buildService();

    await expect(
      service.createComplete({ cabecera: {} as never, detalles: [] }, "7")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getPersisted()).toHaveLength(0);
  });

  it("rolls back the first detail when a later detail fails", async () => {
    const { service, dataSource, internal, getPersisted } = buildService();
    const buildDetail = vi
      .fn()
      .mockResolvedValueOnce({ paymentId: payment.id, publicId: "first" })
      .mockRejectedValueOnce(new BadRequestException("Acreedor no disponible."));
    internal.buildDetail = buildDetail;

    await expect(
      service.createComplete(
        {
          cabecera: {} as never,
          detalles: [{ acreedorId: "first" }, { acreedorId: "second" }] as never
        },
        "7"
      )
    ).rejects.toThrow("Detalle 2");

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(getPersisted()).toHaveLength(0);
  });

  it("rejects cancelling the header through the complete edit endpoint", async () => {
    const { service, dataSource } = buildService();

    await expect(
      service.updateComplete(payment.publicId, {
        cabecera: { estado: "ANULADO" },
        detalles: [],
        anularIds: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
