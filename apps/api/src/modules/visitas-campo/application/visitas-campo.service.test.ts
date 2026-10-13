import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import ExcelJS from "exceljs";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitasCampoService } from "./visitas-campo.service";

type RepoMock = {
  find: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
};

function makeRepo(): RepoMock {
  return {
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    createQueryBuilder: vi.fn()
  };
}

function makeQueryBuilder<T>(result: T[], count: number) {
  return {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([result, count]),
    getMany: vi.fn().mockResolvedValue(result),
    getOne: vi.fn().mockResolvedValue(result[0] ?? null)
  };
}

function makeUQ(constraint: string) {
  return new QueryFailedError("insert", [], {
    code: "23505",
    constraint
  } as unknown as Error);
}

function makeVisita(overrides: Partial<VisitaCampoEntity> = {}): VisitaCampoEntity {
  return {
    id: "1",
    publicId: "pub-v1",
    nroFicha: "F-001",
    cultivoId: "10",
    variedadId: "20",
    parcelaId: "30",
    campaniaId: "40",
    agronomoUsuarioId: "u1",
    nroPlantas: 100,
    areaHectares: "2.5",
    fechaSiembra: "2025-09-01",
    fechaVisita: "2026-06-15",
    horaVisitaInicio: "08:00",
    horaVisitaFin: "10:30",
    etapaFenologicaId: "50",
    subEtapaId: null,
    subEtapaPercentage: null,
    observacionGeneral: null,
    firmaAgronomoNombre: null,
    firmaProductorNombre: null,
    ubicacionVisita: null,
    sincronizadoAt: null,
    isActive: true,
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
    cultivo: undefined as unknown as VisitaCampoEntity["cultivo"],
    variedad: undefined as unknown as VisitaCampoEntity["variedad"],
    parcela: undefined as unknown as VisitaCampoEntity["parcela"],
    campania: undefined as unknown as VisitaCampoEntity["campania"],
    agronomoUsuario: undefined as unknown as VisitaCampoEntity["agronomoUsuario"],
    etapaFenologica: undefined as unknown as VisitaCampoEntity["etapaFenologica"],
    subEtapa: undefined as unknown as VisitaCampoEntity["subEtapa"],
    evaluaciones: [],
    observacionesSanitarias: [],
    riego: undefined as unknown as VisitaCampoEntity["riego"],
    labores: [],
    calificaciones: [],
    ...overrides
  } as VisitaCampoEntity;
}

function makeFindQuery(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    limit: 50,
    skip: 0,
    take: 50,
    ...overrides
  } as unknown as import("../presentation/dto/find-visitas-campo-query.dto").FindVisitasCampoQueryDto;
}

describe("VisitasCampoService", () => {
  let repo: RepoMock;
  let service: VisitasCampoService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    service = new VisitasCampoService(
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never
    );
  });

  describe("#findAll", () => {
    it("should return paginated visitas via QueryBuilder", async () => {
      const qb = makeQueryBuilder([makeVisita()], 1);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(makeFindQuery());

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("visita");
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(qb.orderBy).toHaveBeenCalledWith("visita.fechaVisita", "DESC");
      expect(qb.addOrderBy).toHaveBeenCalledWith("visita.horaVisitaInicio", "DESC");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it("should return empty array when no visitas", async () => {
      const qb = makeQueryBuilder([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(makeFindQuery());

      expect(result.data).toEqual([]);
      expect(result.meta?.totalPages).toBe(0);
    });
  });

  describe("#findById", () => {
    it("should return visita when found", async () => {
      repo.findOne.mockResolvedValue(makeVisita({ id: "42" }));

      const result = await service.findById("42");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "42" },
        relations: { phenologicalStages: { stage: true, subStage: true } }
      });
      expect(result.data.id).toBe("42");
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  describe("#visit histories", () => {
    it("should start productor histories with an active-visita condition", () => {
      const qb = makeQueryBuilder([], 0);
      repo.createQueryBuilder.mockReturnValue(qb);

      (
        service as unknown as {
          createHistoryQueryBuilder: () => unknown;
        }
      ).createHistoryQueryBuilder();

      expect(qb.where).toHaveBeenCalledWith("visita.activo = true");
    });

    it("should fetch parcela histories using only active visitas", async () => {
      repo.findOne.mockResolvedValue({
        id: "30",
        publicId: "parcela-public-id",
        productorId: "10",
        subsectorId: "20",
        code: "P-001",
        name: "Parcela Norte",
        isActive: true,
        subsector: { sectorId: "40" }
      });
      repo.findAndCount.mockResolvedValue([[makeVisita()], 1]);

      await service.findHistoryByParcelaId("30", {
        page: 1,
        limit: 30,
        skip: 0,
        take: 30
      });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parcelaId: "30", isActive: true }
        })
      );
    });
  });

  describe("#getFullDetail", () => {
    it("should hide inactive visitas as not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getFullDetail("inactive-id")).rejects.toThrow(
        NotFoundException
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "inactive-id", isActive: true },
        relations: { phenologicalStages: { stage: true, subStage: true } }
      });
      expect(repo.find).not.toHaveBeenCalled();
    });

    it("should include every recorded irrigation context field", async () => {
      repo.findOne
        .mockResolvedValueOnce(makeVisita())
        .mockResolvedValueOnce({
          id: "riego-1",
          visitaId: "1",
          tipoRiegoId: "tipo-1",
          fuenteAgua: "subterranea",
          tipoSuelo: "franco",
          humedadSuelo: "optimo",
          estresHidrico: false
        })
        .mockResolvedValueOnce({ id: "50", name: "Floracion" });
      repo.find.mockResolvedValue([]);

      const result = await service.getFullDetail("1");

      expect(result.data.riego).toEqual({
        id: "riego-1",
        visitaId: "1",
        tipoRiegoId: "tipo-1",
        fuenteAgua: "subterranea",
        tipoSuelo: "franco",
        humedadSuelo: "optimo",
        estresHidrico: false
      });
    });
  });

  describe("#exportExcelReport", () => {
    it("should generate an operational workbook for the requested date range", async () => {
      repo.find.mockResolvedValue([
        {
          ...makeVisita(),
          nroFicha: "F-100",
          fechaVisita: "2026-08-15",
          fechaSiembra: "2024-05-20",
          horaVisitaInicio: "08:00",
          horaVisitaFin: "09:30",
          agronomoUsuario: { firstName: "Ana", lastName: "Lopez" },
          cultivo: { name: "Mango" },
          campania: { name: "Mango 2026" },
          etapaFenologica: { type: "Etapa", name: "Floracion" },
          subEtapaId: "60",
          subEtapaPercentage: "37.5",
          observacionesSanitarias: [
            { id: "1", plagaEnfermedad: { type: "plaga", name: "Mosca de la fruta" } },
            { id: "2", plagaEnfermedad: { type: "plaga", name: "Trips" } },
            { id: "3", plagaEnfermedad: { type: "plaga", name: "Acaros" } },
            { id: "4", plagaEnfermedad: { type: "plaga", name: "Cochinilla" } },
            { id: "5", plagaEnfermedad: { type: "enfermedad", name: "Antracnosis" } },
            { id: "6", plagaEnfermedad: { type: "enfermedad", name: "Oidio" } },
            { id: "7", plagaEnfermedad: { type: "enfermedad", name: "Mildiu" } }
          ],
          evaluaciones: [
            {
              id: "1",
              order: 1,
              nutrientId: "nutrient-1",
              description: "Nutricion - Calcio",
              nutrient: { name: "Calcio" }
            }
          ],
          riego: [{ humedadSuelo: "Húmedo", estresHidrico: true }],
          parcela: {
            code: "PAR-100",
            name: "Predio Norte",
            areaHectares: "8.25",
            productor: { firstName: "Rosa", lastName: "Diaz", documentNumber: null },
            subsector: { name: "Subsector Norte", sector: { name: "Sector Norte" } }
          }
        }
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31",
        agronomo_usuario_id: "7"
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            agronomoUsuarioId: "7"
          }),
          relations: expect.objectContaining({
            cultivo: true,
            observacionesSanitarias: { plagaEnfermedad: true },
            evaluaciones: { nutrient: true },
            riego: true
          })
        })
      );
      expect(report.fileName).toBe("reporte-visitas_2026-08-01_2026-08-31.xlsx");
      expect(report.content.subarray(0, 2)).toEqual(Buffer.from("PK"));

      const workbook = new ExcelJS.Workbook();
      const xlsxContent = report.content as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0];
      await workbook.xlsx.load(xlsxContent);
      const worksheet = workbook.getWorksheet("Visitas");

      expect(worksheet).toBeDefined();
      const headerValues = [
        "Fecha",
        "N.° ficha",
        "Cultivo",
        "Agrónomo",
        "Productor",
        "Sector",
        "Subsector",
        "Parcela",
        "Fecha de siembra",
        "Edad del cultivo",
        "Nro de hectáreas",
        "Categoría",
        "Hora inicio",
        "Hora fin",
        "Etapa o labor",
        "% de parcela",
        "Plagas",
        "Enfermedades",
        "Nutrición",
        "Humedad del suelo",
        "Estrés hídrico intencional",
        "Estado"
      ];

      for (const [index, value] of headerValues.entries()) {
        expect(worksheet!.getRow(4).getCell(index + 1).value).toBe(value);
      }
      expect(worksheet!.getRow(4).height).toBe(32);
      expect(worksheet!.autoFilter).toBe("A4:V4");
      expect(worksheet!.getCell("V1").isMerged).toBe(true);
      expect(worksheet!.getCell("V4").fill).toMatchObject({
        fgColor: { argb: "FF2F6B4F" }
      });
      expect(worksheet!.getCell("V4").font).toMatchObject({
        bold: true,
        color: { argb: "FFFFFFFF" }
      });

      expect(worksheet!.getRow(5).getCell(2).value).toBe("VSM0001");
      expect(worksheet!.getRow(5).getCell(3).value).toBe("Mango");
      expect(worksheet!.getRow(5).getCell(4).value).toBe("Ana Lopez");
      expect(worksheet!.getRow(5).getCell(5).value).toBe("Diaz Rosa");
      expect(worksheet!.getRow(5).getCell(6).value).toBe("Sector Norte");
      expect(worksheet!.getRow(5).getCell(7).value).toBe("Subsector Norte");
      expect(worksheet!.getRow(5).getCell(8).value).toBe("PAR-100 - Predio Norte");
      expect(worksheet!.getRow(5).getCell(9).value).toBe("2024-05-20");
      expect(worksheet!.getRow(5).getCell(10).value).toBe("2 años, 2 meses");
      expect(worksheet!.getRow(5).getCell(11).value).toBe(8.25);
      expect(worksheet!.getRow(5).getCell(11).numFmt).toBe("0.####");
      expect(worksheet!.getRow(5).getCell(12).value).toBe("Mediano");
      expect(worksheet!.getRow(5).getCell(14).value).toBe("09:30");
      expect(worksheet!.getRow(5).getCell(15).value).toBe("Floracion");
      expect(worksheet!.getRow(5).getCell(16).value).toBe("");
      expect(worksheet!.getRow(5).getCell(17).value).toBe("Mosca de la fruta");
      expect(worksheet!.getRow(6).getCell(17).value).toBe("Trips");
      expect(worksheet!.getRow(7).getCell(17).value).toBe("Acaros");
      expect(worksheet!.getRow(8).getCell(17).value).toBe("Cochinilla");
      expect(worksheet!.getRow(5).getCell(18).value).toBe("Antracnosis");
      expect(worksheet!.getRow(6).getCell(18).value).toBe("Oidio");
      expect(worksheet!.getRow(7).getCell(18).value).toBe("Mildiu");
      expect(worksheet!.getRow(8).getCell(18).value).toBe("");
      expect(worksheet!.getRow(5).getCell(19).value).toBe("Calcio");
      expect(worksheet!.getRow(5).getCell(20).value).toBe("Húmedo");
      expect(worksheet!.getRow(5).getCell(21).value).toBe("Sí");
      expect(worksheet!.getCell("P5").isMerged).toBe(true);
      expect(worksheet!.getCell("P8").isMerged).toBe(true);
      expect(worksheet!.getCell("T5").isMerged).toBe(true);
      expect(worksheet!.getCell("T8").isMerged).toBe(true);
      expect(worksheet!.getCell("U5").isMerged).toBe(true);
      expect(worksheet!.getCell("V5").isMerged).toBe(true);
      expect(worksheet!.getCell("I5").isMerged).toBe(true);
      expect(worksheet!.getCell("L8").isMerged).toBe(true);
      expect(worksheet!.getCell("A5").isMerged).toBe(true);
      expect(worksheet!.getCell("A8").isMerged).toBe(true);
      expect(worksheet!.getCell("T5").alignment).toMatchObject({
        horizontal: "center",
        vertical: "middle"
      });
      expect(worksheet!.getCell("Q5").fill).toMatchObject({
        fgColor: { argb: "FFFFF7ED" }
      });
    });

    it("exports each stage and labor with its own percentage and keeps diagnoses aligned", async () => {
      repo.find.mockResolvedValue([
        makeVisita({
          fechaVisita: "2026-08-15",
          phenologicalStages: [
            {
              order: 2,
              etapaFenologicaId: "52",
              stage: { name: "Cosecha", type: "Etapa" },
              subStage: { name: "Final" },
              coveragePercentage: null,
              laborProgressPercentage: null
            },
            {
              order: 0,
              etapaFenologicaId: "50",
              stage: { name: "Floración", type: "Etapa" },
              subStage: { name: "Inicio" },
              coveragePercentage: 40,
              laborProgressPercentage: null
            },
            {
              order: 1,
              etapaFenologicaId: "51",
              stage: { name: "Poda", type: "Labor" },
              subStage: null,
              coveragePercentage: null,
              laborProgressPercentage: "25"
            }
          ] as VisitaCampoEntity["phenologicalStages"],
          observacionesSanitarias: [
            { id: "1", plagaEnfermedad: { type: "plaga", name: "Trips" } }
          ] as VisitaCampoEntity["observacionesSanitarias"]
        })
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]
      );
      const worksheet = workbook.getWorksheet("Visitas")!;

      expect(worksheet.getCell("O5").value).toBe("Floración");
      expect(worksheet.getCell("P5").value).toBe(0.4);
      expect(worksheet.getCell("O6").value).toBe("Poda");
      expect(worksheet.getCell("P6").value).toBe("");
      expect(worksheet.getCell("O7").value).toBe("Cosecha");
      expect(worksheet.getCell("P7").value).toBe("");
      expect(worksheet.getCell("P5").numFmt).toBe("0.##%");
      expect(worksheet.getRow(4).getCell(16).value).toBe("% de parcela");
      expect(worksheet.getCell("O5").isMerged).toBe(false);
      expect(worksheet.getCell("A5").isMerged).toBe(true);
      expect(worksheet.getCell("A7").isMerged).toBe(true);
      expect(worksheet.getCell("Q5").value).toBe("Trips");
      expect(worksheet.getCell("Q7").isMerged).toBe(true);
    });

    it("uses current parcel area at category boundaries and leaves missing values clear", async () => {
      const areas = ["3.9999", "4", "7", "10", null];
      repo.find.mockResolvedValue(areas.map((area, index) => makeVisita({
        id: String(index + 1),
        areaHectares: "2.5",
        fechaSiembra: index === 4 ? null : "2026-08-16",
        fechaVisita: "2026-08-15",
        parcela: { code: `PAR-${index}`, areaHectares: area } as VisitaCampoEntity["parcela"]
      })));

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01", fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const worksheet = workbook.getWorksheet("Visitas")!;

      expect([5, 6, 7, 8, 9].map((row) => worksheet.getCell(`L${row}`).value))
        .toEqual(["Micro", "Pequeño", "Mediano", "Grande", "Sin categoría"]);
      expect([5, 6, 7, 8, 9].map((row) => worksheet.getCell(`K${row}`).value))
        .toEqual([3.9999, 4, 7, 10, ""]);
      expect(worksheet.getCell("J5").value).toBe("");
      expect(worksheet.getCell("I9").value).toBe("");
      expect(worksheet.getCell("J9").value).toBe("");
    });

    it("keeps a 22-column header and filter when there are no visits", async () => {
      repo.find.mockResolvedValue([]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01", fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const worksheet = workbook.getWorksheet("Visitas")!;

      expect(worksheet.rowCount).toBe(4);
      expect(worksheet.getRow(4).cellCount).toBe(22);
      expect(worksheet.autoFilter).toBe("A4:V4");
    });

    it("renames only the two requested stages in the Excel for legacy and multi-stage visits", async () => {
      repo.find.mockResolvedValue([
        makeVisita({
          etapaFenologica: { name: "  MADURACIÓN   DEL BROTE " } as VisitaCampoEntity["etapaFenologica"]
        }),
        makeVisita({
          id: "2",
          phenologicalStages: [
            {
              order: 2,
              etapaFenologicaId: "52",
              stage: { name: "Poda", type: "Labor" },
              coveragePercentage: 20
            },
            {
              order: 0,
              etapaFenologicaId: "50",
              stage: { name: "maduracion de brotes", type: "Etapa" },
              coveragePercentage: 40
            },
            {
              order: 1,
              etapaFenologicaId: "51",
              stage: { name: "dESARROLLO DEL FRUTO", type: "Etapa" },
              coveragePercentage: 40
            }
          ] as VisitaCampoEntity["phenologicalStages"]
        })
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-01-01",
        fecha_hasta: "2026-12-31"
      });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const worksheet = workbook.getWorksheet("Visitas")!;

      expect(worksheet.getCell("O5").value).toBe("Maduración de yemas");
      expect(worksheet.getCell("O6").value).toBe("Maduración de yemas");
      expect(worksheet.getCell("O7").value).toBe("Llenado de fruto");
      expect(worksheet.getCell("O8").value).toBe("Poda");
      expect(worksheet.getCell("P6").value).toBe(0.4);
      expect(worksheet.getCell("P7").value).toBe(0.4);
      expect(worksheet.getCell("P8").value).toBe(0.2);
    });

    it("sizes long distribution and merged parcel text without losing content", async () => {
      const longStageName =
        "Etapa de floración con observaciones extensas en toda la parcela";
      const longDiagnosisName = "Diagnóstico sanitario extenso ".repeat(4).trim();
      const longParcelName = "Parcela de producción con descripción extensa "
        .repeat(5)
        .trim();
      repo.find.mockResolvedValue([
        makeVisita({
          fechaVisita: "2026-08-15",
          phenologicalStages: [
            {
              order: 0,
              etapaFenologicaId: "50",
              stage: { name: longStageName, type: "Etapa" },
              coveragePercentage: 60,
              laborProgressPercentage: null
            },
            {
              order: 1,
              etapaFenologicaId: "51",
              stage: { name: "Poda", type: "Labor" },
              coveragePercentage: 40,
              laborProgressPercentage: null
            }
          ] as VisitaCampoEntity["phenologicalStages"],
          observacionesSanitarias: [
            { id: "1", plagaEnfermedad: { type: "plaga", name: longDiagnosisName } },
            { id: "2", plagaEnfermedad: { type: "plaga", name: "Acaros" } }
          ] as VisitaCampoEntity["observacionesSanitarias"],
          parcela: {
            code: "PAR-100",
            name: longParcelName,
            productor: { firstName: "Rosa", lastName: "Diaz" },
            subsector: { name: "Norte", sector: { name: "Sector Norte" } }
          } as VisitaCampoEntity["parcela"]
        })
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]
      );
      const worksheet = workbook.getWorksheet("Visitas")!;

      expect(worksheet.getColumn(15).width).toBe(48);
      expect(worksheet.getColumn(17).width).toBe(48);
      expect(worksheet.getCell("O5").value).toBe(longStageName);
      expect(worksheet.getCell("Q5").value).toBe(longDiagnosisName);
      expect(worksheet.getCell("O5").alignment?.wrapText).toBe(true);
      expect(worksheet.getRow(5).height).toBeGreaterThan(23);
      expect(worksheet.getCell("H5").isMerged).toBe(true);
      expect(worksheet.getCell("H6").isMerged).toBe(true);
      expect(worksheet.getCell("H5").value).toBe(`PAR-100 - ${longParcelName}`);
      expect(
        (worksheet.getRow(5).height ?? 0) + (worksheet.getRow(6).height ?? 0)
      ).toBeGreaterThan(90);
    });

    it("should show the absence labels when a visit has no diagnoses", async () => {
      repo.find.mockResolvedValue([
        {
          ...makeVisita(),
          id: "27",
          nroFicha: null,
          fechaVisita: "2026-08-15",
          horaVisitaInicio: "08:00",
          horaVisitaFin: null,
          agronomoUsuario: { firstName: "Ana", lastName: "Lopez" },
          etapaFenologica: { type: "Etapa", name: "Floracion" },
          observacionesSanitarias: [],
          evaluaciones: [],
          parcela: {
            code: "PAR-100",
            name: "Predio Norte",
            productor: { firstName: "Rosa", lastName: "Diaz", documentNumber: null },
            subsector: { name: "Subsector Norte", sector: { name: "Sector Norte" } }
          }
        }
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      const xlsxContent = report.content as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0];
      await workbook.xlsx.load(xlsxContent);
      const worksheet = workbook.getWorksheet("Visitas");

      expect(worksheet!.getRow(5).getCell(16).value).toBe("");
      expect(worksheet!.getRow(5).getCell(17).value).toBe("Sin plagas");
      expect(worksheet!.getRow(5).getCell(18).value).toBe("Sin enfermedades");
      expect(worksheet!.getRow(5).getCell(19).value).toBe(
        "Sin deficiencias nutricionales"
      );
      expect(worksheet!.getRow(5).getCell(2).value).toBe("VSM0027");
      expect(worksheet!.getRow(5).getCell(20).value).toBe("No registrado");
      expect(worksheet!.getRow(5).getCell(21).value).toBe("No");
    });

    it("should center absence labels across all rows created by pest diagnoses", async () => {
      repo.find.mockResolvedValue([
        {
          ...makeVisita(),
          fechaVisita: "2026-08-15",
          horaVisitaInicio: "08:00",
          horaVisitaFin: null,
          agronomoUsuario: { firstName: "Ana", lastName: "Lopez" },
          etapaFenologica: { type: "Etapa", name: "Floracion" },
          observacionesSanitarias: [
            { id: "1", plagaEnfermedad: { type: "plaga", name: "Trips" } },
            { id: "2", plagaEnfermedad: { type: "plaga", name: "Acaros" } }
          ],
          evaluaciones: [],
          parcela: {
            code: "PAR-100",
            name: "Predio Norte",
            productor: { firstName: "Rosa", lastName: "Diaz", documentNumber: null },
            subsector: { sector: { name: "Sector Norte" } }
          }
        }
      ]);

      const report = await service.exportExcelReport({
        fecha_desde: "2026-08-01",
        fecha_hasta: "2026-08-31"
      });
      const workbook = new ExcelJS.Workbook();
      const xlsxContent = report.content as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0];
      await workbook.xlsx.load(xlsxContent);
      const worksheet = workbook.getWorksheet("Visitas");

      expect(worksheet!.getRow(5).getCell(17).value).toBe("Trips");
      expect(worksheet!.getRow(6).getCell(17).value).toBe("Acaros");
      expect(worksheet!.getCell("R5").isMerged).toBe(true);
      expect(worksheet!.getCell("R6").isMerged).toBe(true);
      expect(worksheet!.getCell("S5").isMerged).toBe(true);
      expect(worksheet!.getCell("S6").isMerged).toBe(true);
      expect(worksheet!.getCell("R5").alignment).toMatchObject({
        horizontal: "center",
        vertical: "middle"
      });
    });

    it("should reject an inverted date range before querying visits", async () => {
      await expect(
        service.exportExcelReport({
          fecha_desde: "2026-08-31",
          fecha_hasta: "2026-08-01"
        })
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.find).not.toHaveBeenCalled();
    });

    it("should constrain an agronomist to their own visits", async () => {
      repo.find.mockResolvedValue([]);

      await service.exportExcelReport(
        {
          fecha_desde: "2026-01-01",
          fecha_hasta: "2026-01-31",
          agronomo_usuario_id: "another-agronomist"
        },
        { userId: "current-agronomist", roles: ["AGRONOMO"] }
      );

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agronomoUsuarioId: "current-agronomist" })
        })
      );
    });
  });

  describe("#remove", () => {
    it("should soft-delete by setting isActive to false", async () => {
      const visita = makeVisita({ id: "5", isActive: true });
      repo.findOne.mockResolvedValue(visita);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.remove("5", {
        userId: "admin-1",
        roles: ["ADMIN"]
      });

      expect(repo.save).toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should return unchanged when already inactive", async () => {
      const visita = makeVisita({ id: "6", isActive: false });
      repo.findOne.mockResolvedValue(visita);

      const result = await service.remove("6", {
        userId: "admin-1",
        roles: ["ADMIN"]
      });

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.data.isActive).toBe(false);
    });

    it("should throw NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove("999", { userId: "admin-1", roles: ["ADMIN"] })
      ).rejects.toThrow(NotFoundException);
    });

    it("allows an authorized agronomist to delete their own visit", async () => {
      const visita = makeVisita({ id: "7", agronomoUsuarioId: "agro-1" });
      repo.findOne
        .mockResolvedValueOnce(visita)
        .mockResolvedValueOnce({ id: "agro-1", canDeleteVisits: true });
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.remove("7", {
        userId: "agro-1",
        roles: ["AGRONOMO"]
      });

      expect(result.data.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(visita);
    });

    it("rejects an agronomist without the individual permission", async () => {
      repo.findOne
        .mockResolvedValueOnce(makeVisita({ agronomoUsuarioId: "agro-1" }))
        .mockResolvedValueOnce({ id: "agro-1", canDeleteVisits: false });

      await expect(
        service.remove("1", { userId: "agro-1", roles: ["AGRONOMO"] })
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it("hides visits owned by another agronomist", async () => {
      repo.findOne.mockResolvedValue(makeVisita({ agronomoUsuarioId: "agro-owner" }));

      await expect(
        service.remove("1", { userId: "agro-other", roles: ["AGRONOMO"] })
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("#create", () => {
    const validDto = {
      cropId: "10",
      varietyId: "20",
      parcelaId: "30",
      campaignId: "40",
      agronomistUserId: "u1",
      visitDate: "2026-06-15",
      startVisitTime: "08:00",
      phenologicalStageId: "50"
    };

    function mockStageReferences() {
      repo.findOne.mockImplementation(async ({ where }: { where: { id?: string } }) => {
        switch (where.id) {
          case "10": return { id: "10" };
          case "20": return { id: "20", cultivoId: "10" };
          case "30": return { id: "30", isActive: true };
          case "40": return { id: "40", cultivoId: "10" };
          case "u1": return { id: "u1" };
          case "50": case "51": return { id: where.id, cultivoId: "10", type: "Etapa" };
          case "52": return { id: "52", cultivoId: "10", type: "Labor" };
          case "60": return { id: "60", etapaFenologicaId: "50" };
          case "61": return { id: "61", etapaFenologicaId: "51" };
          default: return null;
        }
      });
      repo.create.mockImplementation((value: object) => ({ ...makeVisita(), ...value }));
      const stageSave = vi.fn(async (rows: unknown[]) => rows);
      const manager = {
        save: vi.fn(async (value: object) => ({ ...value, id: "1" })),
        getRepository: vi.fn(() => ({ save: stageSave }))
      };
      (repo as unknown as { manager: unknown }).manager = {
        transaction: (callback: (value: typeof manager) => Promise<unknown>) => callback(manager)
      };
      return { manager, stageSave };
    }

    it("stores both entries and selects the stage with the largest parcel share", async () => {
      const { stageSave } = mockStageReferences();
      const result = await service.create({
        ...validDto,
        phenologicalStageId: "51",
        subEtapaId: "61",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 40 },
          { phenologicalStageId: "51", subEtapaId: "61", coveragePercentage: 60 }
        ]
      });
      expect(stageSave).toHaveBeenCalledOnce();
      expect(result.data.phenologicalStageId).toBe("51");
      expect(result.data.phenologicalStages.map((row) => row.coveragePercentage)).toEqual([40, 60]);
    });

    it("rejects a distribution whose stages do not cover the whole parcel", async () => {
      const { stageSave } = mockStageReferences();
      await expect(service.create({
        ...validDto,
        subEtapaId: "60",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 60 },
          { phenologicalStageId: "51", subEtapaId: "61", coveragePercentage: 30 }
        ]
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(stageSave).not.toHaveBeenCalled();
    });

    it("counts labor coverage alongside stage coverage", async () => {
      const { stageSave } = mockStageReferences();
      const result = await service.create({
        ...validDto,
        subEtapaId: "60",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 60 },
          { phenologicalStageId: "52", coveragePercentage: 40, laborProgressPercentage: 25 }
        ]
      });
      expect(stageSave).toHaveBeenCalledOnce();
      expect(result.data.phenologicalStages.map((row) => row.coveragePercentage)).toEqual([60, 40]);
      expect(result.data.phenologicalStages[1].laborProgressPercentage).toBe(25);
    });

    it("rejects a mixed distribution that exceeds the parcel", async () => {
      const { stageSave } = mockStageReferences();
      await expect(service.create({
        ...validDto,
        subEtapaId: "60",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 70 },
          { phenologicalStageId: "52", coveragePercentage: 40, laborProgressPercentage: 25 }
        ]
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(stageSave).not.toHaveBeenCalled();
    });

    it("shares parcel coverage with a labor and selects the largest entry", async () => {
      const { stageSave } = mockStageReferences();
      const result = await service.create({
        ...validDto,
        distributionMode: "shared",
        phenologicalStageId: "52",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 40 },
          { phenologicalStageId: "52", coveragePercentage: 60 }
        ]
      });
      expect(result.data.phenologicalStageId).toBe("52");
      expect(result.data.phenologicalStages.map((row) => row.coveragePercentage)).toEqual([40, 60]);
      expect(stageSave).toHaveBeenCalledOnce();
    });

    it("accepts a labor as the only selected entry at 100%", async () => {
      mockStageReferences();
      const result = await service.create({
        ...validDto,
        distributionMode: "shared",
        phenologicalStageId: "52",
        phenologicalStages: [{ phenologicalStageId: "52", coveragePercentage: 100 }]
      });
      expect(result.data.phenologicalStages[0].coveragePercentage).toBe(100);
    });

    it("rejects a shared distribution with missing labor coverage or an incomplete sum", async () => {
      const { stageSave } = mockStageReferences();
      const input = {
        ...validDto,
        distributionMode: "shared" as const,
        phenologicalStageId: "52"
      };
      await expect(service.create({
        ...input,
        phenologicalStages: [{ phenologicalStageId: "52" }]
      })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create({
        ...input,
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 40 },
          { phenologicalStageId: "52", coveragePercentage: 50 }
        ]
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(stageSave).not.toHaveBeenCalled();
    });

    it("accepts the earlier payload and preserves its separate labor progress", async () => {
      mockStageReferences();
      const result = await service.create({
        ...validDto,
        subEtapaId: "60",
        phenologicalStages: [
          { phenologicalStageId: "50", subEtapaId: "60", coveragePercentage: 100 },
          { phenologicalStageId: "52", laborProgressPercentage: 45 }
        ]
      });
      expect(result.data.phenologicalStages[1]).toMatchObject({
        coveragePercentage: null,
        laborProgressPercentage: 45
      });
    });

    it("should reject when parcela not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto)).rejects.toThrow();
    });

    it("rejects a visit when the parcela is inactive", async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: "10" })
        .mockResolvedValueOnce({ id: "20", cultivoId: "10" })
        .mockResolvedValueOnce({ id: "30", isActive: false });

      await expect(service.create(validDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("hides a parcela assigned to another agronomist", async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: "10" })
        .mockResolvedValueOnce({ id: "20", cultivoId: "10" })
        .mockResolvedValueOnce({
          id: "30",
          isActive: true,
          agronomoUsuarioId: "otro-agronomo"
        });

      await expect(
        service.create(validDto, {
          userId: "u1",
          roles: ["AGRONOMO"]
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should handle duplicate nroFicha via ConflictException", async () => {
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce({ id: "10" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "20" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "30" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "40" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "u1" } as never);
      repo.findOne.mockResolvedValueOnce({ id: "50", type: "Etapa" } as never);
      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockReturnValue(makeVisita());
      repo.save.mockRejectedValue(makeUQ("visitas_campo_nro_ficha_key"));
      await expect(service.create({ ...validDto, nroFicha: "F-001" })).rejects.toThrow();
    });
  });

  it("prevents a legacy update from replacing multiple stage entries", async () => {
    repo.findOne.mockResolvedValueOnce(makeVisita({
      phenologicalStages: [
        { etapaFenologicaId: "50", coveragePercentage: 60, order: 0 },
        { etapaFenologicaId: "51", coveragePercentage: 40, order: 1 }
      ] as VisitaCampoEntity["phenologicalStages"]
    }));
    await expect(service.update("1", { phenologicalStageId: "51" }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("prevents an earlier client from replacing a covered labor", async () => {
    repo.findOne.mockResolvedValueOnce(makeVisita({
      phenologicalStages: [{
        etapaFenologicaId: "52",
        coveragePercentage: 100,
        stage: { type: "Labor" }
      }] as VisitaCampoEntity["phenologicalStages"]
    }));
    await expect(service.update("1", {
      phenologicalStages: [{ phenologicalStageId: "52", coveragePercentage: null }]
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
