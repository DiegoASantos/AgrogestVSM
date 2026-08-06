import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import type { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EtapaFenologicaEntity } from "../../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import type { NivelIncidenciaEntity } from "../infrastructure/persistence/entities/nivel-incidencia.entity";
import type { PlagaEnfermedadEtapaNivelEntity } from "../infrastructure/persistence/entities/plaga-enfermedad-etapa-nivel.entity";
import type { PlagaEnfermedadEntity } from "../infrastructure/persistence/entities/plaga-enfermedad.entity";
import { SanitaryCatalogsService } from "./sanitary-catalogs.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    remove: vi.fn()
  };
}

function asRepo<T>(repo: RepoMock): Repository<T> {
  return repo as unknown as Repository<T>;
}

function makePagination(overrides: Partial<{ page: number; limit: number }> = {}) {
  const page = overrides.page ?? 1;
  const limit = overrides.limit ?? 50;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  } as unknown as import("../../../common/dto/pagination-query.dto").PaginationQueryDto;
}

function makePlagaEnfermedad(overrides: Partial<PlagaEnfermedadEntity> = {}): PlagaEnfermedadEntity {
  return {
    id: "1",
    scientificName: "Spodoptera frugiperda",
    name: "Gusano cogollero",
    type: "plaga",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    observaciones: [],
    etapasNiveles: [],
    ...overrides
  } as PlagaEnfermedadEntity;
}

function makeNivelIncidencia(overrides: Partial<NivelIncidenciaEntity> = {}): NivelIncidenciaEntity {
  return {
    id: 1,
    type: "incidencia",
    name: "Bajo",
    grade: 5,
    sortOrder: 1,
    description: "Nivel bajo de incidencia",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    etapasNiveles: [],
    ...overrides
  } as NivelIncidenciaEntity;
}

function makeStageLevel(overrides: Partial<PlagaEnfermedadEtapaNivelEntity> = {}): PlagaEnfermedadEtapaNivelEntity {
  return {
    id: "1",
    plagaEnfermedadId: "1",
    etapaFenologicaId: "10",
    nivelIncidenciaSeveridadId: 1,
    description: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    plagaEnfermedad: undefined as unknown as PlagaEnfermedadEtapaNivelEntity["plagaEnfermedad"],
    etapaFenologica: undefined as unknown as PlagaEnfermedadEtapaNivelEntity["etapaFenologica"],
    nivelIncidenciaSeveridad: undefined as unknown as PlagaEnfermedadEtapaNivelEntity["nivelIncidenciaSeveridad"],
    ...overrides
  } as PlagaEnfermedadEtapaNivelEntity;
}

function makeUniqueViolation(constraint: string) {
  const driverError = { code: "23505", constraint };
  return new QueryFailedError("insert", [], driverError as unknown as Error);
}

describe("SanitaryCatalogsService", () => {
  let plagasRepo: RepoMock;
  let nivelesRepo: RepoMock;
  let etapasNivelesRepo: RepoMock;
  let etapasRepo: RepoMock;
  let service: SanitaryCatalogsService;

  beforeEach(() => {
    vi.clearAllMocks();
    plagasRepo = makeRepo();
    nivelesRepo = makeRepo();
    etapasNivelesRepo = makeRepo();
    etapasRepo = makeRepo();
    service = new SanitaryCatalogsService(
      asRepo<PlagaEnfermedadEntity>(plagasRepo),
      asRepo<NivelIncidenciaEntity>(nivelesRepo),
      asRepo<PlagaEnfermedadEtapaNivelEntity>(etapasNivelesRepo),
      asRepo<EtapaFenologicaEntity>(etapasRepo)
    );
  });

  describe("#findAllPestDiseases", () => {
    it("should return paginated pest diseases ordered by type and name ASC", async () => {
      plagasRepo.findAndCount.mockResolvedValue([[makePlagaEnfermedad()], 1]);

      const result = await service.findAllPestDiseases(makePagination());

      expect(plagasRepo.findAndCount).toHaveBeenCalledWith({
        order: { type: "ASC", name: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("#findPestDiseaseById", () => {
    it("should return pest disease when found", async () => {
      plagasRepo.findOne.mockResolvedValue(makePlagaEnfermedad({ id: "5" }));

      const result = await service.findPestDiseaseById("5");

      expect(result.data.id).toBe("5");
    });

    it("should throw NotFoundException when not found", async () => {
      plagasRepo.findOne.mockResolvedValue(null);

      await expect(service.findPestDiseaseById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#createPestDisease", () => {
    it("should persist pest disease with default values", async () => {
      const entity = makePlagaEnfermedad({ id: "2", name: "Mildiu", type: "enfermedad" });
      plagasRepo.create.mockReturnValue(entity);
      plagasRepo.save.mockResolvedValue(entity);

      const result = await service.createPestDisease({ name: "Mildiu", type: "enfermedad" });

      expect(plagasRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ scientificName: null, isActive: true })
      );
      expect(result.success).toBe(true);
    });

    it("should throw ConflictException when unique name constraint fails", async () => {
      plagasRepo.create.mockReturnValue(makePlagaEnfermedad());
      plagasRepo.save.mockRejectedValue(makeUniqueViolation("plagas_enfermedades_nombre_key"));

      await expect(
        service.createPestDisease({ name: "DUP", type: "plaga" })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#updatePestDisease", () => {
    it("should merge partial updates and save", async () => {
      const existing = makePlagaEnfermedad({ id: "3", name: "Old" });
      const merged = makePlagaEnfermedad({ id: "3", name: "New" });
      plagasRepo.findOne.mockResolvedValue(existing);
      plagasRepo.merge.mockReturnValue(merged);
      plagasRepo.save.mockResolvedValue(merged);

      const result = await service.updatePestDisease("3", { name: "New" });

      expect(result.data.name).toBe("New");
    });

    it("should throw NotFoundException when not found", async () => {
      plagasRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePestDisease("999", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("#removePestDisease", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const pd = makePlagaEnfermedad({ id: "4", isActive: true });
      plagasRepo.findOne.mockResolvedValue(pd);
      plagasRepo.save.mockImplementation(async (e) => e);

      const result = await service.removePestDisease("4");

      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when not found", async () => {
      plagasRepo.findOne.mockResolvedValue(null);

      await expect(service.removePestDisease("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findAllIncidenceLevels", () => {
    it("should return paginated incidence levels ordered by type, sortOrder and id ASC", async () => {
      nivelesRepo.findAndCount.mockResolvedValue([[makeNivelIncidencia()], 1]);

      const result = await service.findAllIncidenceLevels(makePagination());

      expect(nivelesRepo.findAndCount).toHaveBeenCalledWith({
        order: { type: "ASC", sortOrder: "ASC", id: "ASC" },
        skip: 0,
        take: 50
      });
      expect(result.success).toBe(true);
    });
  });

  describe("#createIncidenceLevel", () => {
    it("should create and persist incidence level, relying on DB for uniqueness", async () => {
      const entity = makeNivelIncidencia({ id: 2, name: "Medio", sortOrder: 2, grade: 15 });
      nivelesRepo.create.mockReturnValue(entity);
      nivelesRepo.save.mockResolvedValue(entity);

      const result = await service.createIncidenceLevel({
        type: "incidencia",
        name: "Medio",
        sortOrder: 2,
        grade: 15
      });

      expect(nivelesRepo.create).toHaveBeenCalledWith({
        name: "Medio",
        sortOrder: 2,
        grade: 15,
        type: "incidencia"
      });
      expect(result.success).toBe(true);
    });

    it("should throw ConflictException when DB unique constraint fails", async () => {
      nivelesRepo.create.mockReturnValue(makeNivelIncidencia());
      nivelesRepo.save.mockRejectedValue(makeUniqueViolation("niveles_incidencia_severidad_tipo_nombre_key"));

      await expect(
        service.createIncidenceLevel({ type: "incidencia", name: "X", sortOrder: 1, grade: 0 })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("#removeIncidenceLevel", () => {
    it("should hard-delete via repository.remove", async () => {
      const level = makeNivelIncidencia({ id: 5 });
      nivelesRepo.findOne.mockResolvedValue(level);
      nivelesRepo.remove.mockResolvedValue(level);

      const result = await service.removeIncidenceLevel("5");

      expect(nivelesRepo.remove).toHaveBeenCalledWith(level);
      expect(result.success).toBe(true);
    });
  });

  describe("#findAllPestDiseaseStageLevels", () => {
    it("should return paginated stage levels with relations", async () => {
      etapasNivelesRepo.findAndCount.mockResolvedValue([[makeStageLevel()], 1]);

      const result = await service.findAllPestDiseaseStageLevels(makePagination());

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("#createPestDiseaseStageLevel", () => {
    it("should validate FK references, persist, and re-query for response", async () => {
      plagasRepo.findOne.mockResolvedValueOnce(makePlagaEnfermedad());
      etapasRepo.findOne.mockResolvedValueOnce({ id: "10" });
      nivelesRepo.findOne.mockResolvedValueOnce(makeNivelIncidencia());
      const entity = makeStageLevel({ id: "3" });
      etapasNivelesRepo.create.mockReturnValue(entity);
      etapasNivelesRepo.save.mockResolvedValue(entity);
      etapasNivelesRepo.findOne.mockResolvedValueOnce(entity);

      const result = await service.createPestDiseaseStageLevel({
        plagaEnfermedadId: "1",
        etapaFenologicaId: "10",
        nivelIncidenciaSeveridadId: 1
      });

      expect(plagasRepo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(etapasRepo.findOne).toHaveBeenCalledWith({ where: { id: "10" } });
      expect(nivelesRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.success).toBe(true);
    });

    it("should throw BadRequestException when pest disease not found", async () => {
      plagasRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createPestDiseaseStageLevel({
          plagaEnfermedadId: "999",
          etapaFenologicaId: "10",
          nivelIncidenciaSeveridadId: 1
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("#updatePestDiseaseStageLevel", () => {
    it("should merge partial updates, save, and re-query for response", async () => {
      const existing = makeStageLevel({ id: "4", isActive: true });
      const merged = makeStageLevel({ id: "4", isActive: false });
      etapasNivelesRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(merged);
      etapasNivelesRepo.merge.mockReturnValue(merged);
      etapasNivelesRepo.save.mockResolvedValue(merged);

      const result = await service.updatePestDiseaseStageLevel("4", { isActive: false });

      expect(result.data.isActive).toBe(false);
    });
  });

  describe("#removePestDiseaseStageLevel", () => {
    it("should soft-delete by setting isActive to false and re-query", async () => {
      const sl = makeStageLevel({ id: "6", isActive: true });
      const saved = makeStageLevel({ id: "6", isActive: false });
      etapasNivelesRepo.findOne
        .mockResolvedValueOnce(sl)
        .mockResolvedValueOnce(saved);
      etapasNivelesRepo.save.mockImplementation(async (e) => e);

      const result = await service.removePestDiseaseStageLevel("6");

      expect(result.data.isActive).toBe(false);
    });
  });
});
