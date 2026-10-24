import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { MobileRecoveryService } from "./mobile-recovery.service";

function setup() {
  const dataSource = { query: vi.fn() };
  const jwt = {
    signAsync: vi.fn(async (value: unknown) => JSON.stringify(value)),
    verifyAsync: vi.fn(async (value: string) => JSON.parse(value))
  };
  const technicalVisits = { getFullDetail: vi.fn(async (id: string) => ({ data: { visita: { id } } })) };
  const stepNotes = { findByVisitaId: vi.fn(async () => ({ data: [] })) };
  const commercialVisits = { get: vi.fn(async (id: string) => ({ data: { id } })) };
  const recipes = { findByVisitaId: vi.fn(async () => ({ data: null })) };
  const payments = { findOneByOrFail: vi.fn(async ({ id }: { id: string }) => ({ id })) };
  const harvests = { findOneByOrFail: vi.fn(async ({ id }: { id: string }) => ({ id })) };
  const creditors = { findOneBy: vi.fn(async () => null) };
  return {
    service: new MobileRecoveryService(
      dataSource as never, jwt as never, technicalVisits as never, stepNotes as never, commercialVisits as never,
      recipes as never, payments as never, harvests as never, creditors as never
    ),
    dataSource,
    jwt,
    technicalVisits,
    commercialVisits,
    payments
  };
}

describe("MobileRecoveryService", () => {
  it("scopes list and counts to JWT user and returns complete aggregates in pages", async () => {
    const { service, dataSource, technicalVisits } = setup();
    dataSource.query
      .mockResolvedValueOnce([{ visita_tecnica: "1", visita_comercial: "0", pago_cosecha: "0", registro_cosecha: "0" }])
      .mockResolvedValueOnce([{ type: "visita_tecnica", id: "41" }]);

    const result = await service.getPage({ userId: "7", roles: ["AGRONOMO"] } as never);

    expect(dataSource.query.mock.calls[0][1][0]).toBe("7");
    expect(dataSource.query.mock.calls[1][1][0]).toBe("7");
    expect(dataSource.query.mock.calls[1][0]).toContain("agronomo_usuario_id = $1");
    expect(result.items).toEqual([{ type: "visita_tecnica", id: "41", data: { visita: { id: "41" }, stepNotes: [], receta: null } }]);
    expect(technicalVisits.getFullDetail).toHaveBeenCalledWith("41");
  });

  it("rejects a cursor that was signed for another account", async () => {
    const { service, dataSource, jwt } = setup();
    jwt.verifyAsync.mockResolvedValue({
      userId: "another-user", offset: 0, snapshot: new Date().toISOString(), from: "2026-01-01", to: "2026-01-30"
    } as never);
    await expect(service.getPage({ userId: "7" } as never, "cursor"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("rejects a cursor that fails signature validation", async () => {
    const { service, dataSource, jwt } = setup();
    jwt.verifyAsync.mockRejectedValue(new Error("signature mismatch"));
    await expect(service.getPage({ userId: "7" } as never, "tampered-token"))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("uses a signed account-bound cursor for a subsequent page", async () => {
    const { service, dataSource, jwt, payments } = setup();
    const state = { userId: "7", offset: 50, snapshot: new Date().toISOString(), from: "2026-01-01", to: "2026-01-30" };
    jwt.verifyAsync.mockResolvedValue(state as never);
    dataSource.query
      .mockResolvedValueOnce([{ visita_tecnica: "0", visita_comercial: "0", pago_cosecha: "51", registro_cosecha: "0" }])
      .mockResolvedValueOnce(Array.from({ length: 51 }, (_, index) => ({ type: "pago_cosecha", id: String(index + 50) })));

    const result = await service.getPage({ userId: "7" } as never, "signed-cursor");

    expect(payments.findOneByOrFail).toHaveBeenCalledTimes(50);
    expect(result.items).toHaveLength(50);
    expect(result.nextCursor).toBeTruthy();
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ offset: 100, userId: "7" }), expect.any(Object));
  });

  it("loads commercial visits by public UUID while retaining the internal server ID for mobile", async () => {
    const { service, dataSource, commercialVisits } = setup();
    dataSource.query
      .mockResolvedValueOnce([{ visita_tecnica: "0", visita_comercial: "1", pago_cosecha: "0", registro_cosecha: "0" }])
      .mockResolvedValueOnce([{ type: "visita_comercial", id: "42", publicId: "e0a0f50f-f4a8-4f9e-906e-2acb39e4dcbe" }]);
    const page = await service.getPage({ userId: "7", roles: ["AGRONOMO"] } as never);
    expect(commercialVisits.get).toHaveBeenCalledWith("e0a0f50f-f4a8-4f9e-906e-2acb39e4dcbe", expect.any(Object));
    expect(page.items[0]).toMatchObject({ type: "visita_comercial", id: "42" });
  });
});
