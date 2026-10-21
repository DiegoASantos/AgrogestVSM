import { BadRequestException, ConflictException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { DuplicadosProductoresService } from "./duplicados-productores.service";

function fixture(options: { conflictingDocument?: boolean; conflictingCreditor?: boolean; staleParcel?: boolean } = {}) {
  const statements: string[] = [];
  const people = [
    { id: "1", entityType: "persona", firstName: "José", lastName: "Fernández Pérez",
      documentTypeId: null, documentNumber: null, phone: null, email: null, address: null,
      isActive: true, lastContinuityConfirmationAt: null, mergedIntoId: null },
    { id: "2", entityType: "persona", firstName: "Jose Alberto", lastName: "Fernandez Perez",
      documentTypeId: 1, documentNumber: "12345678", phone: null, email: null, address: null,
      isActive: true, lastContinuityConfirmationAt: null, mergedIntoId: null }
  ];
  if (options.conflictingDocument) {
    people[0] = { ...people[0], documentTypeId: 1, documentNumber: "87654321" };
  }
  const parcels = [
    { id: "10", productorId: "1", subsectorId: "5", agronomistUserId: "7", name: "Norte", code: "PAR-010",
      geometry: null, isActive: true, mergedIntoId: null, snapshot: "principal-v1" },
    { id: "20", productorId: "2", subsectorId: "5", agronomistUserId: "7", name: "Norte", code: "PAR-020",
      geometry: null, isActive: true, mergedIntoId: null, snapshot: "secondary-v1" }
  ];
  const creditors = [
    { id: "30", productorId: "1", documentType: "DNI", documentNumber: "11223344",
      bank: "BCP", accountNumber: "998877", approvalStatus: "APPROVED", mergedIntoId: null, snapshot: "creditor-1" },
    { id: "40", productorId: "2", documentType: "DNI", documentNumber: "11223344",
      bank: "BCP", accountNumber: options.conflictingCreditor ? "654321" : "998877",
      approvalStatus: "APPROVED", mergedIntoId: null, snapshot: "creditor-2" }
  ];
  let parcelReads = 0;
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    statements.push(sql);
    if (sql.includes("FROM productor_unificaciones")) return [];
    if (sql.includes("FROM productor_duplicado_casos")) {
      return [{ id: "9", lesserId: "1", greaterId: "2", status: "PENDIENTE", reasons: ["NOMBRE"] }];
    }
    if (sql.includes("FROM productores WHERE id")) return people.filter((row) => row.id === params[0]);
    if (sql.includes("FROM parcelas WHERE productor_id IN")) {
      parcelReads += 1;
      if (options.staleParcel && parcelReads > 1) parcels[1].snapshot = "secondary-v2";
      return parcels;
    }
    if (sql.includes("FROM acreedores_cosecha WHERE productor_id IN")) return creditors;
    if (sql.includes("FROM visitas_campo WHERE parcela_id")) return [{ id: "50" }];
    if (sql.includes("FROM invitaciones_acreedor_productor")) return [];
    if (sql.includes("SELECT id::text FROM")) {
      if (sql.includes("FROM parcelas")) return [{ id: "20" }];
      if (sql.includes("FROM acreedores_cosecha")) return [{ id: "40" }];
      return [];
    }
    return [];
  });
  const manager = { query };
  const dataSource = {
    query,
    transaction: vi.fn(async (_isolation: string, callback: (value: typeof manager) => Promise<unknown>) =>
      callback(manager))
  } as unknown as DataSource;
  return { service: new DuplicadosProductoresService(dataSource), statements, dataSource };
}

describe("DuplicadosProductoresService", () => {
  it("includes each producer creator in pending identity cases", async () => {
    const { service, statements } = fixture();
    await service.list();
    const sql = statements.find((statement) => statement.includes("FROM productor_duplicado_casos c"));
    expect(sql).toContain('AS "lesserRecordedBy"');
    expect(sql).toContain('AS "greaterRecordedBy"');
    expect(sql).toContain("LEFT JOIN usuarios autor_a");
    expect(sql).toContain("LEFT JOIN usuarios autor_b");
  });

  it("permite volver a proponer manualmente un par descartado", async () => {
    const { service, statements } = fixture();
    await service.propose("2", "1");
    expect(statements.some((sql) => sql.includes("WHERE productor_duplicado_casos.estado = 'DESCARTADO'")))
      .toBe(true);
  });

  it("muestra parcelas y acreedores que necesitan confirmación sin exponer cuentas", async () => {
    const { service } = fixture();
    const response = await service.preview("9", "1");
    expect(response.data.possibleSameParcels).toEqual([
      { sourceParcelId: "20", targetParcelId: "10", name: "Norte" }
    ]);
    expect(response.data.possibleSameCreditors).toEqual([
      { sourceCreditorId: "40", targetCreditorId: "30", bank: "BCP", accountLast4: "8877" }
    ]);
    expect(JSON.stringify(response.data)).not.toContain("998877");
  });

  it("bloquea documentos y cuentas contradictorios antes de mover datos", async () => {
    const { service, statements } = fixture({ conflictingDocument: true, conflictingCreditor: true });
    const preview = (await service.preview("9", "1")).data;
    expect(preview.conflicts).toHaveLength(2);
    await expect(service.merge({ caseId: "9", principalId: "1", fingerprint: preview.fingerprint,
      parcelMappings: [{ sourceParcelId: "20", targetParcelId: "10" }],
      creditorMappings: [], userId: "7" })).rejects.toBeInstanceOf(ConflictException);
    expect(statements.some((sql) => sql.startsWith("UPDATE parcelas"))).toBe(false);
  });

  it("rechaza una confirmación si cambia una parcela desde la vista previa", async () => {
    const { service, statements } = fixture({ staleParcel: true });
    const preview = (await service.preview("9", "1")).data;
    await expect(service.merge({ caseId: "9", principalId: "1", fingerprint: preview.fingerprint,
      parcelMappings: [{ sourceParcelId: "20", targetParcelId: "10" }],
      creditorMappings: [{ sourceCreditorId: "40", targetCreditorId: "30" }], userId: "7" }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(statements.some((sql) => sql.startsWith("UPDATE parcelas"))).toBe(false);
  });

  it("requiere mapeos explícitos y mueve relaciones en una transacción", async () => {
    const { service, statements, dataSource } = fixture();
    const preview = (await service.preview("9", "1")).data;
    const input = { caseId: "9", principalId: "1", fingerprint: preview.fingerprint,
      parcelMappings: [{ sourceParcelId: "20", targetParcelId: "10" }],
      creditorMappings: [{ sourceCreditorId: "40", targetCreditorId: "30" }], userId: "7" };
    await expect(service.merge({ ...input, creditorMappings: [] })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.merge({ ...input, parcelMappings: [{ sourceParcelId: "20", targetParcelId: "99" }] }))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(service.merge({ ...input, parcelMappings: [...input.parcelMappings, ...input.parcelMappings] }))
      .rejects.toBeInstanceOf(BadRequestException);
    const result = await service.merge(input);
    expect(result.data).toEqual({ principalId: "1", secondaryId: "2" });
    expect(dataSource.transaction).toHaveBeenCalledWith("SERIALIZABLE", expect.any(Function));
    expect(statements.some((sql) => sql.includes("UPDATE visitas_campo SET parcela_id"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE registros_cosecha SET acreedor_id"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE fotos_comerciales_productor SET productor_id"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE productores SET fusionado_en_id = $2 WHERE fusionado_en_id = $1"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE parcelas SET fusionada_en_id = $2 WHERE fusionada_en_id = $1"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE acreedores_cosecha SET fusionado_en_id = $2 WHERE fusionado_en_id = $1"))).toBe(true);
    expect(statements.some((sql) => sql.includes("UPDATE invitaciones_acreedor_productor SET revocado_at"))).toBe(true);
    expect(statements.some((sql) => sql.includes("INSERT INTO productor_unificaciones"))).toBe(true);
  });
});
