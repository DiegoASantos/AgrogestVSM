import { describe, expect, it, vi } from "vitest";

import { ParcelasService } from "./parcelas.service";
import type { ParcelaEntity } from "../infrastructure/persistence/entities/parcela.entity";

function buildParcela(overrides: Partial<ParcelaEntity> = {}): ParcelaEntity {
  const now = new Date("2026-07-01T00:00:00.000Z");

  return {
    id: "1",
    publicId: "parcela-public-1",
    sectorId: "1",
    productorId: "1",
    code: "PAR-001",
    name: "Parcela Norte",
    areaHectares: null,
    description: null,
    referencePoint: null,
    geometry: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    sector: {} as never,
    productor: {} as never,
    visitasCampo: [],
    ...overrides
  };
}

function buildService(sequenceValues: Array<string | number> = [1]) {
  const parcelasRepository = {
    query: vi.fn(async () => [{ value: sequenceValues.shift() ?? 1 }]),
    create: vi.fn((value: Partial<ParcelaEntity>) => buildParcela(value)),
    save: vi.fn(async (value: ParcelaEntity) => value),
    findOne: vi.fn(),
    find: vi.fn()
  };
  const sectoresRepository = {
    findOne: vi.fn(async () => ({ id: "1" }))
  };
  const productoresRepository = {
    findOne: vi.fn(async () => ({ id: "1" }))
  };

  const service = new ParcelasService(
    parcelasRepository as never,
    sectoresRepository as never,
    productoresRepository as never,
    {} as never
  );

  return { parcelasRepository, productoresRepository, sectoresRepository, service };
}

describe("ParcelasService", () => {
  describe("create", () => {
    it("generates PAR-001 when the sequence returns one", async () => {
      const { parcelasRepository, service } = buildService([1]);

      const result = await service.create({
        productorId: "1",
        sectorId: "1",
        name: "Parcela Norte"
      });

      expect(parcelasRepository.query).toHaveBeenCalledWith(
        "SELECT nextval('parcelas_codigo_seq')::bigint AS value"
      );
      expect(parcelasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "PAR-001",
          productorId: "1",
          sectorId: "1"
        })
      );
      expect(result.data).toMatchObject({ code: "PAR-001" });
    });

    it("pads codes to three digits and grows beyond PAR-999", async () => {
      const { parcelasRepository, service } = buildService([4, 1000]);

      const firstResult = await service.create({
        productorId: "1",
        sectorId: "1"
      });
      const secondResult = await service.create({
        productorId: "1",
        sectorId: "1"
      });

      expect(firstResult.data).toMatchObject({ code: "PAR-004" });
      expect(secondResult.data).toMatchObject({ code: "PAR-1000" });
      expect(parcelasRepository.query).toHaveBeenCalledTimes(2);
    });

    it("ignores a client-provided code when creating a parcela", async () => {
      const { parcelasRepository, service } = buildService([2]);

      const result = await service.create({
        productorId: "1",
        sectorId: "1",
        code: "LOTE-A"
      });

      expect(parcelasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: "PAR-002" })
      );
      expect(result.data).toMatchObject({ code: "PAR-002" });
    });

    it("uses a fresh sequence value for each concurrent creation", async () => {
      const { service } = buildService([1, 2]);

      const [firstResult, secondResult] = await Promise.all([
        service.create({ productorId: "1", sectorId: "1" }),
        service.create({ productorId: "1", sectorId: "1" })
      ]);

      expect([firstResult.data.code, secondResult.data.code]).toEqual([
        "PAR-001",
        "PAR-002"
      ]);
    });
  });
});
