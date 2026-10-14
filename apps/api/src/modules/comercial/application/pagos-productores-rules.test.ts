import { describe, expect, it, vi } from "vitest";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { DetallePagoProductorEntity } from "../infrastructure/persistence/entities/detalle-pago-productor.entity";
import { TipoDocumentoEntity } from "../../tipos-documento/infrastructure/persistence/entities/tipo-documento.entity";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { PagosProductoresService } from "./pagos-productores.service";

const payment = {
  id: "10", productorId: "20", crateQuantity: 100, netWeight: "2000.00",
  sourceSystem: "SYSTRACE", sourceProducerCode: "P1", guideNumber: "G1",
  lot: "L1", harvestReceptionDate: "2026-10-14", status: "PENDIENTE"
};
const detail = {
  acreedorId: "creditor", supervisorId: "supervisor", cantidadJabas: 40,
  precioJaba: "40.00", precioKilo: "2.00", precioBase: "JABA",
  porcentajePeso: "80.00", aplicaFairtrade: false,
  tipoDescuento: "NO_APLICA", montoDescuento: "0", detraccion: "0",
  observacion: ""
};
type PrivateRules = {
  buildDetail(manager: unknown, payment: unknown, detail: unknown): Promise<{ paymentDate: string | null }>;
  assertReceptionCapacity(manager: unknown, payment: unknown, previousAssigned: number): Promise<void>;
  lockReception(manager: unknown, payment: unknown): Promise<void>;
  unchangedDetail(existing: unknown, detail: unknown): boolean;
  todayInLima(): string;
};

function rulesService() {
  const creditor = {
    id: "30", productorId: "20", approvalStatus: "APPROVED",
    creditorDocumentType: "DNI", creditorDocumentNumber: "12345678"
  };
  const userQuery = {
    select: vi.fn().mockReturnThis(), innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(async () => ({ id: "40" }))
  };
  const manager = {
    query: vi.fn(async () => [] as unknown[]),
    getRepository: vi.fn((entity: unknown) => {
      if (entity === AcreedorCosechaEntity) return { findOne: vi.fn(async () => creditor) };
      if (entity === TipoDocumentoEntity) return { findOne: vi.fn(async () => ({ id: 1 })) };
      if (entity === UserEntity) return { createQueryBuilder: vi.fn(() => userQuery) };
      if (entity === DetallePagoProductorEntity) return { create: (value: unknown) => value };
      throw new Error("Unexpected repository");
    })
  };
  const service = new PagosProductoresService({ manager } as never, { list: vi.fn() } as never);
  return { rules: service as unknown as PrivateRules, manager };
}

describe("PagosProductoresService detail rules", () => {
  it("requires an allowed observation for an observed detail", async () => {
    const { rules, manager } = rulesService();
    await expect(rules.buildDetail(manager, payment, {
      ...detail, estado: "OBSERVADO"
    })).rejects.toThrow("observación válida");
  });

  it("stores a payment date and clears it for pending details", async () => {
    const { rules, manager } = rulesService();
    rules.todayInLima = () => "2026-10-14";
    const paid = await rules.buildDetail(manager, payment, {
      ...detail, estado: "PAGADO"
    });
    expect(paid.paymentDate).toBe("2026-10-14");
    const pending = await rules.buildDetail(manager, payment, {
      ...detail, estado: "PENDIENTE", fechaPago: "2026-10-13"
    });
    expect(pending.paymentDate).toBeNull();
  });

  it("rejects adding crates beyond the reception and reports the prior balance", async () => {
    const { rules, manager } = rulesService();
    manager.query.mockResolvedValue([{ jabas: "100", peso_neto: "2000.00", asignadas: "110", pagadas: "40" }]);
    await expect(rules.assertReceptionCapacity(manager, payment, 80))
      .rejects.toThrow("Disponibles: 20");
  });

  it("permits historical over allocation to remain unchanged", async () => {
    const { rules, manager } = rulesService();
    manager.query.mockResolvedValue([{ jabas: "100", peso_neto: "2000.00", asignadas: "110", pagadas: "40" }]);
    await expect(rules.assertReceptionCapacity(manager, payment, 110))
      .resolves.toBeUndefined();
  });

  it("sums partial allocations across two payment headers of the same reception", async () => {
    const { manager } = rulesService();
    manager.query.mockResolvedValue([
      { jabas: "100", peso_neto: "2000.00", asignadas: "40", pagadas: "0" },
      { jabas: "100", peso_neto: "2000.00", asignadas: "60", pagadas: "60" }
    ]);
    const service = new PagosProductoresService({ manager } as never, { list: vi.fn() } as never);
    const response = await service.receptionBalance({
      sistemaOrigen: "SYSTRACE", codigoProductorOrigen: "P1",
      nroGuia: "G1", lote: "L1", fechaRecepcion: "2026-10-14"
    });
    expect(response.data).toMatchObject({
      jabasRecepcion: 100, asignadas: 100, pagadas: 60,
      disponibles: 0, pendientesPago: 40, completo: false
    });
  });

  it("locks the reception key inside the payment transaction", async () => {
    const { rules, manager } = rulesService();
    await rules.lockReception(manager, payment);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_xact_lock"),
      [JSON.stringify(["SYSTRACE", "P1", "G1", "L1", "2026-10-14"])]
    );
  });

  it("keeps an unchanged legacy paid detail without inventing a date or recalculating prices", () => {
    const { rules } = rulesService();
    const existing = {
      creditor: { publicId: "creditor" }, supervisor: { publicId: "supervisor" },
      crateQuantity: 40, cratePrice: "35.10", kiloPrice: "1.76",
      weightPercentage: "0.00", fairtradeApplies: false,
      discountType: "OLD_TYPE", discountAmount: "0.00", withholdingAmount: "0.00",
      settlementNumber: null, observation: "Texto histórico", status: "PAGADO",
      paymentDate: null
    };
    expect(rules.unchangedDetail(existing, {
      acreedorId: "creditor", supervisorId: "supervisor", cantidadJabas: 40,
      precioJaba: "35.10", precioKilo: "1.76", porcentajePeso: "0.00",
      aplicaFairtrade: false, tipoDescuento: "OLD_TYPE", montoDescuento: "0.00",
      detraccion: "0.00", nroLiquidacion: null, observacion: "Texto histórico",
      estado: "PAGADO", fechaPago: null
    })).toBe(true);
  });
});
