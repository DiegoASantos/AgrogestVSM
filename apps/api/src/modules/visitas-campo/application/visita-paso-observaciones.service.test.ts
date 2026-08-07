import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";
import { VisitaPasoObservacionesService } from "./visita-paso-observaciones.service";

type RepoMock = { find: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; merge: ReturnType<typeof vi.fn> };
function makeRepo(): RepoMock { return { find: vi.fn(), findOne: vi.fn(), create: vi.fn(), save: vi.fn(), merge: vi.fn() }; }
function makeStepNote(overrides: Partial<VisitaPasoObservacionEntity> = {}): VisitaPasoObservacionEntity { return { id: "1", visitaId: "100", stepNumber: 1, observation: null, recommendation: null, finalizedAt: null, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), visita: undefined as never, ...overrides } as VisitaPasoObservacionEntity; }

describe("VisitaPasoObservacionesService", () => {
  let stepRepo: RepoMock;
  let visitaRepo: RepoMock;
  let service: VisitaPasoObservacionesService;
  beforeEach(() => { vi.clearAllMocks(); stepRepo = makeRepo(); visitaRepo = makeRepo(); service = new VisitaPasoObservacionesService(stepRepo as never, visitaRepo as never); });

  describe("#findByVisitaId", () => {
    it("should validate visita exists and return step notes", async () => {
      visitaRepo.findOne.mockResolvedValue({ id: "100" } as never);
      stepRepo.find.mockResolvedValue([makeStepNote()]);
      const result = await service.findByVisitaId("100");
      expect(stepRepo.find).toHaveBeenCalledWith({ where: { visitaId: "100" }, order: { stepNumber: "ASC" } });
      expect(result.data).toHaveLength(1);
    });

    it("should throw NotFoundException when visita not found", async () => {
      visitaRepo.findOne.mockResolvedValue(null);
      await expect(service.findByVisitaId("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#findByVisitaIdAndStep", () => {
    it("should return step note when found", async () => {
      visitaRepo.findOne.mockResolvedValue({ id: "100" } as never);
      stepRepo.findOne.mockResolvedValue(makeStepNote({ stepNumber: 2 }));
      const result = await service.findByVisitaIdAndStep("100", 2);
      expect(result.data.stepNumber).toBe(2);
    });

    it("should throw BadRequestException for invalid step number", async () => {
      visitaRepo.findOne.mockResolvedValue({ id: "100" } as never);
      await expect(service.findByVisitaIdAndStep("100", 7)).rejects.toThrow(BadRequestException);
      await expect(service.findByVisitaIdAndStep("100", 0)).rejects.toThrow(BadRequestException);
    });
  });

  describe("#upsert", () => {
    it("should create a new step note when none exists", async () => {
      visitaRepo.findOne.mockResolvedValue({ id: "100" } as never);
      stepRepo.findOne.mockResolvedValue(null);
      const entity = makeStepNote({ id: "2", stepNumber: 1, observation: "Test" });
      stepRepo.create.mockReturnValue(entity);
      stepRepo.save.mockResolvedValue(entity);
      const result = await service.upsert("100", 1, { observation: "Test" });
      expect(result.success).toBe(true);
      expect(result.data.observation).toBe("Test");
    });

    it("should update existing step note via merge", async () => {
      visitaRepo.findOne.mockResolvedValue({ id: "100" } as never);
      const existing = makeStepNote({ id: "3", stepNumber: 2 });
      const merged = makeStepNote({ id: "3", stepNumber: 2, observation: "Updated", finalizedAt: new Date() });
      stepRepo.findOne.mockResolvedValue(existing);
      stepRepo.merge.mockReturnValue(merged);
      stepRepo.save.mockResolvedValue(merged);
      const result = await service.upsert("100", 2, { observation: "Updated", finalized: true });
      expect(stepRepo.merge).toHaveBeenCalled();
      expect(result.data.observation).toBe("Updated");
    });

    it("should throw BadRequestException when visita not found", async () => {
      visitaRepo.findOne.mockResolvedValue(null);
      await expect(service.upsert("999", 1, { observation: "X" })).rejects.toThrow(BadRequestException);
    });
  });
});
