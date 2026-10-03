import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProducerCreditorAccessService } from "./producer-creditor-access.service";
import type { InvitacionAcreedorProductorEntity } from "../infrastructure/persistence/entities/invitacion-acreedor-productor.entity";
import type { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";

const actor = {
  sub: "user",
  userId: "7",
  email: "test@example.invalid",
  roles: ["AGRONOMO"]
};
const invitation: InvitacionAcreedorProductorEntity = {
  id: "invitation-1",
  productorId: "11",
  codeHash: "hash",
  issuedByUserId: "7",
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  createdAt: new Date()
};
const creditor = {
  id: "20",
  publicId: "550e8400-e29b-41d4-a716-446655440001",
  productorId: "11",
  creditorFirstName: "Maria",
  creditorLastName: "Perez",
  creditorDocumentType: "DNI",
  creditorDocumentNumber: "12345678",
  bank: "BCP",
  accountNumber: "123456789",
  approvalStatus: "PENDING",
  source: "PRODUCTOR",
  createdByUserId: null,
  reviewObservation: null,
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
} as AcreedorCosechaEntity;

function buildService() {
  const invitationManager = {
    findOne: vi.fn(async () => ({ id: "11" })),
    update: vi.fn(),
    save: vi.fn()
  };
  const invitations = {
    findOne: vi.fn(async () => invitation),
    manager: {
      transaction: vi.fn(async (run: (manager: unknown) => Promise<unknown>) =>
        run(invitationManager)
      )
    }
  };
  const reviewManager = {
    findOne: vi.fn(async () => ({ ...creditor })),
    save: vi.fn(async (value: object) => value)
  };
  const creditors = {
    findOne: vi.fn(async (): Promise<AcreedorCosechaEntity | null> => null),
    find: vi.fn(async () => [creditor]),
    create: vi.fn((value: object) => value),
    save: vi.fn(async (value: object) => value),
    manager: {
      transaction: vi.fn(async (run: (manager: unknown) => Promise<unknown>) =>
        run(reviewManager)
      )
    }
  };
  const reviews = { find: vi.fn(async () => []) };
  const producers = {
    findOne: vi.fn(async () => ({ id: "11", firstName: "Pedro", lastName: "Rios" }))
  };
  const users = { find: vi.fn(async () => []) };
  const scope = { findById: vi.fn(async () => ({ data: {} })) };
  const jwt = {
    signAsync: vi.fn(async () => "short-session"),
    verifyAsync: vi.fn(async () => ({
      kind: "comercial-productor",
      invitationId: "invitation-1",
      productorId: "11"
    }))
  };
  const service = new ProducerCreditorAccessService(
    invitations as never,
    creditors as never,
    reviews as never,
    producers as never,
    users as never,
    scope as never,
    jwt as never
  );
  return {
    service,
    invitations,
    invitationManager,
    reviewManager,
    creditors,
    scope,
    jwt
  };
}

describe("ProducerCreditorAccessService", () => {
  it("revokes the former code and persists only a hash", async () => {
    const { service, invitationManager, scope } = buildService();
    const result = await service.issue("11", actor);
    expect(scope.findById).toHaveBeenCalledWith("11", actor);
    expect(result.data.code).toMatch(/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/);
    expect(invitationManager.update).toHaveBeenCalled();
    expect(invitationManager.save).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        productorId: "11",
        codeHash: expect.stringMatching(/^[0-9a-f]{64}$/)
      })
    );
    expect(JSON.stringify(invitationManager.save.mock.calls)).not.toContain(
      result.data.code
    );
  });

  it("refuses a revoked code and a session from another producer", async () => {
    const { service, invitations, jwt } = buildService();
    invitations.findOne.mockResolvedValueOnce({ ...invitation, revokedAt: new Date() });
    await expect(service.exchange("ABCD-EFGH-JKLM-NPQR")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    jwt.verifyAsync.mockResolvedValueOnce({
      kind: "comercial-productor",
      invitationId: "invitation-1",
      productorId: "12"
    });
    await expect(service.context("Bearer short-session")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("rejects expired invitations and revokes an already issued session", async () => {
    const { service, invitations } = buildService();
    invitations.findOne.mockResolvedValueOnce({ ...invitation, expiresAt: new Date(Date.now() - 1000) });
    await expect(service.exchange("ABCD-EFGH-JKLM-NPQR")).rejects.toBeInstanceOf(UnauthorizedException);
    invitations.findOne.mockResolvedValueOnce({ ...invitation, revokedAt: new Date() });
    await expect(service.context("Bearer short-session")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("creates a pending creditor within the code's producer scope", async () => {
    const { service, creditors } = buildService();
    await service.createCreditor("Bearer short-session", {
      creditorFirstName: "Maria",
      creditorLastName: "Perez",
      creditorDocumentType: "DNI",
      creditorDocumentNumber: "12345678",
      bank: "BCP",
      accountNumber: "123456789"
    });
    expect(creditors.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productorId: "11",
        approvalStatus: "PENDING",
        source: "PRODUCTOR",
        createdByUserId: null
      })
    );
  });

  it("never exposes another producer's profile through an update", async () => {
    const { service, creditors } = buildService();
    await expect(
      service.updateCreditor("Bearer short-session", "20", {
        creditorFirstName: "Maria",
        creditorLastName: "Perez",
        creditorDocumentType: "DNI",
        creditorDocumentNumber: "12345678",
        bank: "BCP",
        accountNumber: "123456789"
      })
    ).rejects.toMatchObject({ status: 404 });
    expect(creditors.findOne).toHaveBeenCalledWith({
      where: { id: "20", productorId: "11" }
    });
  });

  it("records a review and blocks observation without a note", async () => {
    const { service, reviewManager } = buildService();
    await expect(
      service.review("20", { decision: "OBSERVED", observation: " " }, actor)
    ).rejects.toMatchObject({ status: 400 });
    await service.review(
      "20",
      { decision: "OBSERVED", observation: "Corregir cuenta" },
      actor
    );
    expect(reviewManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalStatus: "OBSERVED",
        reviewObservation: "Corregir cuenta"
      })
    );
    expect(reviewManager.save).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        creditorId: "20",
        reviewerUserId: "7",
        decision: "OBSERVED"
      })
    );
  });
});
