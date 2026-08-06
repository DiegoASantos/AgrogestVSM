import { NotFoundException } from "@nestjs/common";
import type { ObjectLiteral, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DepartamentoEntity } from "../infrastructure/persistence/entities/departamento.entity";
import type { DistritoEntity } from "../infrastructure/persistence/entities/distrito.entity";
import type { ProvinciaEntity } from "../infrastructure/persistence/entities/provincia.entity";
import { GeografiasService } from "./geografias.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  exist: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    exist: vi.fn()
  };
}

function asRepo<T extends ObjectLiteral>(repo: RepoMock): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makeDepartamento(overrides: Partial<DepartamentoEntity> = {}): DepartamentoEntity {
  return {
    id: "1",
    code: "15",
    name: "Lima",
    provincias: [],
    ...overrides
  } as DepartamentoEntity;
}

function makeProvincia(overrides: Partial<ProvinciaEntity> = {}): ProvinciaEntity {
  return {
    id: "2",
    departamentoId: "1",
    code: "1501",
    name: "Lima",
    departamento: undefined as unknown as ProvinciaEntity["departamento"],
    distritos: [],
    ...overrides
  } as ProvinciaEntity;
}

function makeDistrito(overrides: Partial<DistritoEntity> = {}): DistritoEntity {
  return {
    id: "3",
    provinciaId: "2",
    ubigeo: "150101",
    name: "Cercado de Lima",
    provincia: undefined as unknown as DistritoEntity["provincia"],
    sectores: [],
    ...overrides
  } as DistritoEntity;
}

function makeDistritoWithRelations(overrides: Partial<DistritoEntity> = {}): DistritoEntity {
  const departamento = makeDepartamento({ id: "1", code: "15", name: "Lima" });
  const provincia = makeProvincia({
    id: "2",
    departamentoId: "1",
    code: "1501",
    name: "Lima",
    departamento
  });

  return {
    id: "3",
    provinciaId: "2",
    ubigeo: "150101",
    name: "Cercado de Lima",
    provincia,
    sectores: [],
    ...overrides
  } as DistritoEntity;
}

describe("GeografiasService", () => {
  let departamentosRepo: RepoMock;
  let provinciasRepo: RepoMock;
  let distritosRepo: RepoMock;
  let service: GeografiasService;

  beforeEach(() => {
    vi.clearAllMocks();
    departamentosRepo = makeRepo();
    provinciasRepo = makeRepo();
    distritosRepo = makeRepo();
    service = new GeografiasService(
      asRepo<DepartamentoEntity>(departamentosRepo),
      asRepo<ProvinciaEntity>(provinciasRepo),
      asRepo<DistritoEntity>(distritosRepo)
    );
  });

  describe("#findDepartamentos", () => {
    it("should return all departamentos ordered by name ASC with count meta", async () => {
      const dept1 = makeDepartamento({ id: "1", code: "02", name: "Áncash" });
      const dept2 = makeDepartamento({ id: "2", code: "15", name: "Lima" });
      departamentosRepo.find.mockResolvedValue([dept1, dept2]);

      const result = await service.findDepartamentos();

      expect(departamentosRepo.find).toHaveBeenCalledWith({ order: { name: "ASC" } });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: "1", code: "02", name: "Áncash" });
      expect(result.data[1]).toEqual({ id: "2", code: "15", name: "Lima" });
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should return an empty array with count zero when there are no departamentos", async () => {
      departamentosRepo.find.mockResolvedValue([]);

      const result = await service.findDepartamentos();

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#findProvinciasByDepartamentoId", () => {
    it("should return provincias filtered by departamentoId ordered by name ASC with count meta", async () => {
      const prov1 = makeProvincia({ id: "2", departamentoId: "1", code: "1501", name: "Lima" });
      const prov2 = makeProvincia({ id: "3", departamentoId: "1", code: "1502", name: "Barranca" });
      departamentosRepo.exist.mockResolvedValue(true);
      provinciasRepo.find.mockResolvedValue([prov1, prov2]);

      const result = await service.findProvinciasByDepartamentoId("1");

      expect(departamentosRepo.exist).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(provinciasRepo.find).toHaveBeenCalledWith({
        where: { departamentoId: "1" },
        order: { name: "ASC" }
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "2",
        departamentoId: "1",
        code: "1501",
        name: "Lima"
      });
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should throw NotFoundException when the departamento does not exist", async () => {
      departamentosRepo.exist.mockResolvedValue(false);

      await expect(
        service.findProvinciasByDepartamentoId("999")
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array with count zero when departamento exists but has no provincias", async () => {
      departamentosRepo.exist.mockResolvedValue(true);
      provinciasRepo.find.mockResolvedValue([]);

      const result = await service.findProvinciasByDepartamentoId("1");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#findDistritosByProvinciaId", () => {
    it("should return distritos filtered by provinciaId ordered by name ASC with count meta", async () => {
      const dist1 = makeDistrito({ id: "3", provinciaId: "2", ubigeo: "150101", name: "Cercado de Lima" });
      const dist2 = makeDistrito({ id: "4", provinciaId: "2", ubigeo: "150102", name: "Miraflores" });
      provinciasRepo.exist.mockResolvedValue(true);
      distritosRepo.find.mockResolvedValue([dist1, dist2]);

      const result = await service.findDistritosByProvinciaId("2");

      expect(provinciasRepo.exist).toHaveBeenCalledWith({ where: { id: "2" } });
      expect(distritosRepo.find).toHaveBeenCalledWith({
        where: { provinciaId: "2" },
        order: { name: "ASC" }
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "3",
        provinciaId: "2",
        ubigeo: "150101",
        name: "Cercado de Lima"
      });
      expect(result.meta).toEqual({ count: 2 });
    });

    it("should throw NotFoundException when the provincia does not exist", async () => {
      provinciasRepo.exist.mockResolvedValue(false);

      await expect(
        service.findDistritosByProvinciaId("999")
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array with count zero when provincia exists but has no distritos", async () => {
      provinciasRepo.exist.mockResolvedValue(true);
      distritosRepo.find.mockResolvedValue([]);

      const result = await service.findDistritosByProvinciaId("2");

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });
  });

  describe("#findDistritos", () => {
    it("should return all distritos with nested provincia and departamento relations", async () => {
      const distrito = makeDistritoWithRelations();
      distritosRepo.find.mockResolvedValue([distrito]);

      const result = await service.findDistritos();

      expect(distritosRepo.find).toHaveBeenCalledWith({
        relations: { provincia: { departamento: true } },
        order: { name: "ASC" }
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: "3",
        provinciaId: "2",
        ubigeo: "150101",
        name: "Cercado de Lima",
        provincia: {
          id: "2",
          departamentoId: "1",
          code: "1501",
          name: "Lima",
          departamento: {
            id: "1",
            code: "15",
            name: "Lima"
          }
        }
      });
      expect(result.meta).toEqual({ count: 1 });
    });

    it("should return an empty array with count zero when there are no distritos", async () => {
      distritosRepo.find.mockResolvedValue([]);

      const result = await service.findDistritos();

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ count: 0 });
    });

    it("should return multiple distritos with their full nested relations", async () => {
      const dist1 = makeDistritoWithRelations({ id: "3", name: "Cercado de Lima" });
      const dist2 = makeDistritoWithRelations({ id: "4", name: "Miraflores", ubigeo: "150102" });
      distritosRepo.find.mockResolvedValue([dist1, dist2]);

      const result = await service.findDistritos();

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ count: 2 });
      expect(result.data[0].provincia.departamento).toBeDefined();
      expect(result.data[1].provincia.departamento).toBeDefined();
    });
  });
});
