import { describe, expect, it, vi } from "vitest";

import { ParcelasService } from "./parcelas.service";
import type { ParcelaEntity } from "../infrastructure/persistence/entities/parcela.entity";

function buildParcela(overrides: Partial<ParcelaEntity> = {}): ParcelaEntity {
  const now = new Date("2026-07-01T00:00:00.000Z");

  return {
    id: "1",
    publicId: "parcela-public-1",
    subsectorId: "10",
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
    subsector: { id: "10", sectorId: "1" } as never,
    productor: {} as never,
    visitasCampo: [],
    ...overrides
  };
}

function buildService(sequenceValues: Array<string | number> = [1]) {
  const queryBuilder = {
    innerJoinAndSelect: vi.fn(() => queryBuilder),
    where: vi.fn(() => queryBuilder),
    andWhere: vi.fn(() => queryBuilder),
    orderBy: vi.fn(() => queryBuilder),
    addOrderBy: vi.fn(() => queryBuilder),
    skip: vi.fn(() => queryBuilder),
    take: vi.fn(() => queryBuilder),
    getManyAndCount: vi.fn(async () => [[buildParcela()], 1]),
    getOne: vi.fn(async (): Promise<ParcelaEntity | null> => null)
  };
  const parcelasRepository = {
    query: vi.fn(async () => [{ value: sequenceValues.shift() ?? 1 }]),
    create: vi.fn((value: Partial<ParcelaEntity>) => buildParcela(value)),
    save: vi.fn(async (value: ParcelaEntity) => value),
    findOne: vi.fn(),
    find: vi.fn(),
    createQueryBuilder: vi.fn(() => queryBuilder)
  };
  const sectoresRepository = {
    findOne: vi.fn(async () => ({ id: "1" }))
  };
  const subsectoresRepository = {
    findOne: vi.fn(async () => ({ id: "10", sectorId: "1" }))
  };
  const productoresRepository = {
    findOne: vi.fn(async () => ({ id: "1" }))
  };

  const service = new ParcelasService(
    parcelasRepository as never,
    sectoresRepository as never,
    subsectoresRepository as never,
    productoresRepository as never,
    {} as never
  );

  return {
    parcelasRepository,
    productoresRepository,
    queryBuilder,
    sectoresRepository,
    subsectoresRepository,
    service
  };
}

describe("ParcelasService", () => {
  describe("create", () => {
    it("generates PAR-001 when the sequence returns one", async () => {
      const { parcelasRepository, service } = buildService([1]);

      const result = await service.create({
        productorId: "1",
        subsectorId: "10",
        name: "Parcela Norte"
      });

      expect(parcelasRepository.query).toHaveBeenCalledWith(
        "SELECT nextval('parcelas_codigo_seq')::bigint AS value"
      );
      expect(parcelasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "PAR-001",
          productorId: "1",
          subsectorId: "10"
        })
      );
      expect(result.data).toMatchObject({
        code: "PAR-001",
        subsectorId: "10",
        sectorId: "1"
      });
    });

    it("pads codes to three digits and grows beyond PAR-999", async () => {
      const { parcelasRepository, service } = buildService([4, 1000]);

      const firstResult = await service.create({
        productorId: "1",
        subsectorId: "10"
      });
      const secondResult = await service.create({
        productorId: "1",
        subsectorId: "10"
      });

      expect(firstResult.data).toMatchObject({ code: "PAR-004" });
      expect(secondResult.data).toMatchObject({ code: "PAR-1000" });
      expect(parcelasRepository.query).toHaveBeenCalledTimes(2);
    });

    it("ignores a client-provided code when creating a parcela", async () => {
      const { parcelasRepository, service } = buildService([2]);

      const result = await service.create({
        productorId: "1",
        subsectorId: "10",
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
        service.create({ productorId: "1", subsectorId: "10" }),
        service.create({ productorId: "1", subsectorId: "10" })
      ]);

      expect([firstResult.data.code, secondResult.data.code]).toEqual([
        "PAR-001",
        "PAR-002"
      ]);
    });

    it("rejects a duplicated name for the same productor and subsector", async () => {
      const { parcelasRepository, queryBuilder, service } = buildService([1]);
      queryBuilder.getOne.mockResolvedValueOnce(
        buildParcela({ id: "2", code: "PAR-002", name: "Parcela Norte" })
      );

      await expect(
        service.create({
          productorId: "1",
          subsectorId: "10",
          name: "  parcela   norte  "
        })
      ).rejects.toThrow(
        "A parcela with the same name already exists for this productor and subsector."
      );
      expect(parcelasRepository.query).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("rejects a duplicated name when updating productor, subsector or name", async () => {
      const { parcelasRepository, queryBuilder, service } = buildService();
      parcelasRepository.findOne
        .mockResolvedValueOnce(buildParcela({ id: "1", name: "Parcela Sur" }))
        .mockResolvedValueOnce(null);
      queryBuilder.getOne.mockResolvedValueOnce(
        buildParcela({ id: "2", code: "PAR-002", name: "Parcela Norte" })
      );

      await expect(
        service.update("1", {
          productorId: "1",
          subsectorId: "10",
          name: "parcela norte"
        })
      ).rejects.toThrow(
        "A parcela with the same name already exists for this productor and subsector."
      );
      expect(parcelasRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("orders joined parcelas by entity property paths for TypeORM pagination", async () => {
      const { queryBuilder, service } = buildService();

      await service.findAll({
        page: 1,
        limit: 20,
        skip: 0,
        take: 20
      } as never);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "subsector.sectorId",
        "ASC"
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        "parcela.subsectorId",
        "ASC"
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith("parcela.code", "ASC");
    });
  });
});
