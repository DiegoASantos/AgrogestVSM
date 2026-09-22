import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ComercialService } from "./comercial.service";
import type { PagoCosechaEntity } from "../infrastructure/persistence/entities/pago-cosecha.entity";
import type { AccessTokenPayload } from "../../auth/types/auth.types";

const user: AccessTokenPayload = {
  sub: "user-public-id",
  userId: "7",
  email: "agronomo@agrogest.pe",
  roles: ["AGRONOMO"]
};

const dto = {
  publicId: "550e8400-e29b-41d4-a716-446655440000",
  productorId: "1",
  creditorFirstName: "Maria",
  creditorLastName: "Perez",
  creditorDocumentType: "DNI" as const,
  creditorDocumentNumber: "12345678",
  bank: "BCP" as const,
  accountNumber: "1912345678901234567890"
};

function buildPayment(overrides: Partial<PagoCosechaEntity> = {}): PagoCosechaEntity {
  return {
    id: "9",
    publicId: dto.publicId,
    productorId: "2",
    creditorFirstName: dto.creditorFirstName,
    creditorLastName: dto.creditorLastName,
    creditorDocumentType: dto.creditorDocumentType,
    creditorDocumentNumber: dto.creditorDocumentNumber,
    bank: dto.bank,
    accountNumber: dto.accountNumber,
    createdByUserId: "4",
    createdAt: new Date("2026-09-22T00:00:00.000Z"),
    updatedAt: new Date("2026-09-22T00:00:00.000Z"),
    ...overrides
  };
}

function buildService(existing: PagoCosechaEntity | null = null) {
  const pagos = {
    findOne: vi.fn(async () => existing),
    create: vi.fn((value: Partial<PagoCosechaEntity>) => buildPayment(value)),
    save: vi.fn(async (value: PagoCosechaEntity) => value)
  };
  const productores = { findById: vi.fn(async () => ({ data: {} })) };
  const service = new ComercialService(pagos as never, productores as never);

  return { pagos, productores, service };
}

describe("ComercialService", () => {
  it("authorizes the stored producer before returning an idempotent payment", async () => {
    const { pagos, productores, service } = buildService(
      buildPayment({ productorId: "2" })
    );

    const result = await service.create(dto, user);

    expect(result.data.id).toBe("9");
    expect(productores.findById).toHaveBeenCalledWith("2", user);
    expect(pagos.create).not.toHaveBeenCalled();
  });

  it("creates a payment after authorizing its producer", async () => {
    const { pagos, productores, service } = buildService();

    const result = await service.create(dto, user);

    expect(productores.findById).toHaveBeenCalledWith("1", user);
    expect(pagos.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdByUserId: "7", productorId: "1" })
    );
    expect(result.data.id).toBe("9");
  });

  it("rejects a document that does not match its declared type", async () => {
    const { service } = buildService();

    await expect(
      service.create({ ...dto, creditorDocumentNumber: "1234567" }, user)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
