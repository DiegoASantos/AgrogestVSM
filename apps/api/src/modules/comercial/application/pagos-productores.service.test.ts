import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { TipoDocumentoEntity } from "../../tipos-documento/infrastructure/persistence/entities/tipo-documento.entity";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { DetallePagoProductorEntity } from "../infrastructure/persistence/entities/detalle-pago-productor.entity";
import { PagoProductorEntity } from "../infrastructure/persistence/entities/pago-productor.entity";
import { PagosProductoresService } from "./pagos-productores.service";

const payment = {
  id: "10",
  publicId: "550e8400-e29b-41d4-a716-446655440000",
  productorId: "20",
  status: "BORRADOR",
  harvestDate: "2026-10-01",
  harvestReceptionDate: "2026-10-02",
  crateQuantity: 10,
  netWeight: "200"
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
    query: vi.fn(async () => []),
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
  const service = new PagosProductoresService(
    dataSource as never,
    { list: vi.fn() } as never
  );
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
  it("filters active supervisors through TypeORM property paths", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn(async () => ({ id: "30", publicId: "supervisor-public-id" }))
    };
    const manager = {
      getRepository: vi.fn((entity: unknown) => {
        if (entity === AcreedorCosechaEntity) {
          return { findOne: vi.fn(async () => ({
            id: "40",
            publicId: "creditor-public-id",
            productorId: payment.productorId,
            approvalStatus: "APPROVED",
            creditorDocumentType: "DNI",
            creditorDocumentNumber: "12345678"
          })) };
        }
        if (entity === TipoDocumentoEntity) return { findOne: vi.fn(async () => ({ id: "50" })) };
        if (entity === UserEntity) return { createQueryBuilder: vi.fn(() => queryBuilder) };
        if (entity === DetallePagoProductorEntity) return { create: vi.fn((value) => value) };
        throw new Error("Unexpected repository");
      })
    };
    const { service } = buildService();
    const buildDetail = (service as unknown as {
      buildDetail: (
        manager: never,
        payment: PagoProductorEntity,
        dto: never
      ) => Promise<unknown>;
    }).buildDetail;

    await buildDetail.call(service, manager as never, payment, {
      acreedorId: "creditor-public-id",
      supervisorId: "supervisor-public-id",
      cantidadJabas: 2,
      precioJaba: "20",
      precioKilo: "1",
      precioBase: "JABA",
      porcentajePeso: "100",
      aplicaFairtrade: false,
      tipoDescuento: "NO_APLICA",
      montoDescuento: "0",
      detraccion: "0"
    } as never);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      "supervisor.publicId = :publicId",
      { publicId: "supervisor-public-id" }
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith("supervisor.isActive = true");
  });

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

  it("reports an outdated payment schema without blaming creditor data", async () => {
    const { service, internal, details, getPersisted } = buildService();
    internal.buildDetail = vi.fn(async () => ({ paymentId: payment.id }));
    details.save.mockRejectedValueOnce(new QueryFailedError(
      "INSERT INTO detalle_pago_productores ...", [], Object.assign(new Error(), { code: "42703" })
    ));

    await expect(service.createComplete({
      cabecera: {} as never,
      detalles: [{ acreedorId: "first" }] as never
    }, "7")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(getPersisted()).toHaveLength(0);
  });

  it("preserves unexpected errors for server diagnosis instead of reporting invalid user data", async () => {
    const { service, internal, details, getPersisted } = buildService();
    const failure = new Error("Unexpected persistence failure");
    internal.buildDetail = vi.fn(async () => ({ paymentId: payment.id }));
    details.save.mockRejectedValueOnce(failure);

    await expect(service.createComplete({
      cabecera: {} as never,
      detalles: [{ acreedorId: "first" }] as never
    }, "7")).rejects.toBe(failure);
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
