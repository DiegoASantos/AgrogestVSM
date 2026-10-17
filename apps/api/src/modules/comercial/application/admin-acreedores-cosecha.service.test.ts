import { describe, expect, it, vi } from "vitest";
import { IsNull } from "typeorm";
import { AdminAcreedoresCosechaService } from "./admin-acreedores-cosecha.service";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";

const creditor = {
  id: "7", publicId: "550e8400-e29b-41d4-a716-446655440000",
  productorId: "3", productor: { publicId: "550e8400-e29b-41d4-a716-446655440001",
    firstName: "Prueba", lastName: "Dos" },
  creditorFirstName: "Ejemplo", creditorLastName: "Prueba",
  creditorDocumentType: "DNI", creditorDocumentNumber: "12345678",
  bank: "BCP", accountNumber: "12345", approvalStatus: "PENDING",
  source: "ADMIN_WEB"
};

describe("AdminAcreedoresCosechaService", () => {
  it("returns an observed profile to pending after correction", async () => {
    const observed = { ...creditor, approvalStatus: "OBSERVED",
      reviewObservation: "Corregir cuenta", reviewedByUserId: "9", reviewedAt: new Date() };
    const findOne = vi.fn().mockResolvedValue(observed);
    const save = vi.fn(async (value: typeof observed) => value);
    const service = new AdminAcreedoresCosechaService({ getRepository: () =>
      ({ findOne, save }) } as never, {} as never);
    const result = await service.update(creditor.publicId, { banco: "BBVA" });
    expect(result.data.estadoAprobacion).toBe("PENDING");
    expect(save.mock.calls[0][0].reviewObservation).toBeNull();
  });

  it("returns the producer UUID when a new creditor is created for inline approval", async () => {
    const save = vi.fn().mockResolvedValue(creditor);
    const findOne = vi.fn().mockResolvedValue(creditor);
    const dataSource = { getRepository: (entity: unknown) => entity === ProductorEntity
      ? { findOne: vi.fn().mockResolvedValue({ id: "3", publicId: creditor.productor.publicId,
        mergedIntoId: null }) }
      : entity === AcreedorCosechaEntity
        ? { create: (value: unknown) => value, save, findOne } : null };
    const service = new AdminAcreedoresCosechaService(dataSource as never, {} as never);
    const result = await service.create({ productorId: creditor.productor.publicId,
      nombres: "Ejemplo", apellidos: "Prueba", tipoDocumento: "DNI",
      nroDocumento: "12345678", banco: "BCP", nroCuenta: "12345" }, "9");
    expect(result.data.productorId).toBe(creditor.productor.publicId);
    expect(findOne).toHaveBeenCalledWith({ where: { publicId: creditor.publicId },
      relations: { productor: true } });
  });

  it("searches exact documents across producers without merged aliases", async () => {
    const find = vi.fn().mockResolvedValue([creditor]);
    const service = new AdminAcreedoresCosechaService({ getRepository: () => ({ find }) } as never,
      {} as never);
    const result = await service.searchByDocument({ tipoDocumento: "DNI", nroDocumento: "12345678" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].productorId).toBe(creditor.productor.publicId);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: {
      creditorDocumentType: "DNI", creditorDocumentNumber: "12345678",
      mergedIntoId: IsNull()
    } }));
  });

  it("resolves public UUID before delegating to the audited review", async () => {
    const findOne = vi.fn().mockResolvedValue(creditor);
    const review = vi.fn().mockResolvedValue({});
    const service = new AdminAcreedoresCosechaService({ getRepository: () => ({ findOne }) } as never,
      { review } as never);
    const actor = { userId: "9" } as never;
    await service.reviewByPublicId(creditor.publicId,
      { decision: "APPROVED" }, actor);
    expect(review).toHaveBeenCalledWith("7", { decision: "APPROVED" }, actor);
  });
});
