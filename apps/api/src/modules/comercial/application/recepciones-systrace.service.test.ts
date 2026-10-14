import { describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { RecepcionesSystraceService, toHeader } from "./recepciones-systrace.service";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { PagoProductorEntity } from "../infrastructure/persistence/entities/pago-productor.entity";

const reception = {
  nroguia: "G-1",
  lote: "L-1",
  protocolo: "PR",
  nombre_variedad: "Mango",
  tipo_cultivo: "ORGANICO",
  categoria: "CAT",
  codigo_destino: "D1",
  fechacosecha: "2026-02-01",
  fecharecepcion: "2026-02-02",
  totaljabas: 10,
  totalpbruto: "120.00",
  totalptara: "20.00",
  totalpneto: "100.00",
  peso_promedio: "10.00",
  codigo_exportador: "EX",
  codigo_productor: "P-1",
  nombre: "Productor de prueba"
};

describe("recepciones Systrace", () => {
  it("maps one complete reception and rejects invalid dates or amounts", () => {
    expect(toHeader(reception)).toMatchObject({
      sistemaOrigen: "SYSTRACE",
      nroGuia: "G-1",
      jabas: 10,
      pesoNeto: "100.00"
    });
    expect(toHeader({ ...reception, fecharecepcion: "2026-02-30" })).toBeNull();
    expect(toHeader({ ...reception, totalpneto: "100.000" })).toBeNull();
  });

  it("returns only the selected producer and reception date", async () => {
    const source = [reception, { ...reception, nroguia: "G-2", codigo_productor: "P-2", nombre: "Otro" },
      { ...reception, nroguia: "G-3", fecharecepcion: "2026-02-03" }];
    const find = vi.fn().mockResolvedValue([]);
    const db = { getRepository: vi.fn().mockReturnValue({ find }) } as unknown as DataSource;
    const client = { list: vi.fn().mockResolvedValue(source) };
    const service = new RecepcionesSystraceService(db, client as never);

    const result = await service.search({
      fechaRecepcion: "2026-02-02",
      codigoProductor: "P-1",
      page: 1,
      limit: 20,
      skip: 0,
      take: 20
    } as never);

    expect(result.data.productores).toHaveLength(2);
    expect(result.data.recepciones).toHaveLength(1);
    expect(result.data.recepciones[0].nroGuia).toBe("G-1");
  });

  it("returns one paginated reception and flags an existing payment", async () => {
    const db = { getRepository: (entity: unknown) => ({
      find: vi.fn().mockResolvedValue(entity === PagoProductorEntity
        ? [{ publicId: "existing-payment", guideNumber: "G-1", lot: "L-1" }] : [])
    }) } as unknown as DataSource;
    const client = { list: vi.fn().mockResolvedValue([reception, { ...reception, nroguia: "G-2" }]) };
    const service = new RecepcionesSystraceService(db, client as never);

    const result = await service.search({ fechaRecepcion: "2026-02-02",
      codigoProductor: "P-1", page: 1, limit: 1, skip: 0, take: 1 } as never);

    expect(result.data.total).toBe(2);
    expect(result.data.recepciones).toHaveLength(1);
    expect(result.data.recepciones[0].pagoExistenteId).toBe("existing-payment");
  });

  it("requires explicit confirmation to correct a persisted link", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "7", productorId: "2" }]);
    const producer = { id: "3", publicId: "00000000-0000-4000-8000-000000000003",
      firstName: "Prueba", lastName: "Dos", entityType: "persona", isActive: true,
      mergedIntoId: null };
    const manager = {
      getRepository: (entity: unknown) => entity === ProductorEntity
        ? { findOne: vi.fn().mockResolvedValue(producer) } : null,
      query
    };
    const db = { transaction: (callback: (value: typeof manager) => unknown) => callback(manager) } as unknown as DataSource;
    const service = new RecepcionesSystraceService(db, { list: vi.fn().mockResolvedValue([reception]) } as never);
    const dto = { codigoProductor: "P-1", productorId: producer.publicId };

    await expect(service.link(dto, "9")).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("audits an explicitly confirmed correction", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "7", productorId: "2" }])
      .mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const producer = { id: "3", publicId: "00000000-0000-4000-8000-000000000003",
      firstName: "Prueba", lastName: "Dos", entityType: "persona", isActive: true,
      mergedIntoId: null };
    const manager = {
      getRepository: () => ({ findOne: vi.fn().mockResolvedValue(producer) }),
      query
    };
    const db = { transaction: (callback: (value: typeof manager) => unknown) => callback(manager) } as unknown as DataSource;
    const service = new RecepcionesSystraceService(db, { list: vi.fn().mockResolvedValue([reception]) } as never);

    const response = await service.link({ codigoProductor: "P-1", productorId: producer.publicId,
      confirmarCorreccion: true }, "9");

    expect(response.data.productorId).toBe(producer.publicId);
    expect(query.mock.calls[2][0]).toContain("vinculos_productores_systrace_cambios");
    expect(query.mock.calls[2][1]).toEqual(["7", "2", "3", "9"]);
  });
});
