import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { VisitasComercialesService } from "./visitas-comerciales.service";
import { FindVisitasComercialesQueryDto } from "../presentation/dto/find-visitas-comerciales-query.dto";

const user = { userId: "7", roles: ["AGRONOMO"] } as never;
const admin = { userId: "1", roles: ["ADMIN"] } as never;
const base = {
  publicId: "11111111-1111-4111-8111-111111111111",
  tipoSujeto: "PERSONA" as const,
  nombres: "Ana",
  apellidos: "López",
  descripcion: "Visita de presentación",
  fechaVisita: "2026-10-17",
  ubicacionVisita: null
};

function repository(overrides: Record<string, unknown> = {}) {
  return {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ ...value, id: "42" })),
    ...overrides
  };
}

describe("VisitasComercialesService", () => {
  it("requires last names for a person and keeps the authenticated author", async () => {
    const repo = repository();
    const service = new VisitasComercialesService(repo as never, {} as never);
    await expect(service.create({ ...base, apellidos: "" }, user)).rejects.toThrow(
      "apellidos"
    );
    const saved = await service.create(base, user);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ agronomoUsuarioId: "7" })
    );
    expect(saved.data.id).toBe("42");
  });

  it("returns an existing visit on retry and rejects a different author", async () => {
    const repo = repository({
      findOne: vi.fn().mockResolvedValue({ ...base, id: "42", agronomoUsuarioId: "7" })
    });
    const service = new VisitasComercialesService(repo as never, {} as never);
    expect((await service.create(base, user)).data.id).toBe("42");
    expect(repo.save).not.toHaveBeenCalled();
    await expect(service.create(base, admin)).rejects.toThrow("otro usuario");
  });

  it("filters an agronomist's list to their own records", async () => {
    const andWhere = vi.fn(() => queryBuilder);
    const queryBuilder = {
      leftJoinAndSelect: () => queryBuilder,
      where: () => queryBuilder,
      andWhere,
      orderBy: () => queryBuilder,
      addOrderBy: () => queryBuilder,
      skip: () => queryBuilder,
      take: () => queryBuilder,
      getManyAndCount: async () => [[], 0]
    };
    const service = new VisitasComercialesService(
      repository({ createQueryBuilder: () => queryBuilder }) as never,
      {} as never
    );
    await service.list(
      Object.assign(new FindVisitasComercialesQueryDto(), { page: 1, limit: 20 }),
      user
    );
    expect(andWhere).toHaveBeenCalledWith("v.agronomo_usuario_id = :owner", {
      owner: "7"
    });
  });

  it("generates a downloadable PDF with the visit content", async () => {
    const repo = repository({
      findOne: vi.fn().mockResolvedValue({
        ...base,
        id: "42",
        activo: true,
        agronomoUsuarioId: "7",
        agronomoUsuario: { firstName: "Carlos", lastName: "Pérez" }
      })
    });
    const service = new VisitasComercialesService(repo as never, {} as never);
    const report = await service.exportPdf(base.publicId, admin);
    expect(report.fileName).toContain("visita-comercial-2026-10-17");
    expect(report.content.subarray(0, 4).toString()).toBe("%PDF");
    expect(
      (await service.exportPdf(base.publicId, admin)).content.subarray(0, 4).toString()
    ).toBe("%PDF");
  });

  it("adds separate technical and commercial sheets to a general export", async () => {
    const technical = new ExcelJS.Workbook();
    technical.addWorksheet("Visitas").addRow(["Fecha", "Parcela"]);
    const queryBuilder = {
      leftJoinAndSelect: () => queryBuilder,
      where: () => queryBuilder,
      andWhere: () => queryBuilder,
      orderBy: () => queryBuilder,
      addOrderBy: () => queryBuilder,
      getMany: vi.fn().mockResolvedValue([{ ...base, id: "42", agronomoUsuario: null }])
    };
    const repo = repository({ createQueryBuilder: () => queryBuilder });
    const technicalService = {
      exportExcelReport: vi.fn().mockResolvedValue({
        content: Buffer.from(await technical.xlsx.writeBuffer())
      })
    };
    const service = new VisitasComercialesService(
      repo as never,
      technicalService as never
    );
    const report = await service.exportExcel(
      {
        fecha_desde: "2026-10-01",
        fecha_hasta: "2026-10-31",
        tipo: "GENERAL"
      },
      admin
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      report.content as unknown as Parameters<typeof workbook.xlsx.load>[0]
    );
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Técnica",
      "Comercial"
    ]);
    expect(workbook.getWorksheet("Comercial")?.getRow(2).getCell(3).value).toBe("Ana");
    const commercial = await service.exportExcel(
      { fecha_desde: "2026-10-01", fecha_hasta: "2026-10-31", tipo: "COMERCIAL" },
      admin
    );
    const commercialWorkbook = new ExcelJS.Workbook();
    await commercialWorkbook.xlsx.load(
      commercial.content as unknown as Parameters<typeof commercialWorkbook.xlsx.load>[0]
    );
    expect(commercialWorkbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Comercial"
    ]);
    const technicalOnly = await service.exportExcel(
      { fecha_desde: "2026-10-01", fecha_hasta: "2026-10-31", tipo: "TECNICA" },
      admin
    );
    const technicalWorkbook = new ExcelJS.Workbook();
    await technicalWorkbook.xlsx.load(
      technicalOnly.content as unknown as Parameters<typeof technicalWorkbook.xlsx.load>[0]
    );
    expect(technicalWorkbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Visitas"
    ]);
  });
});
