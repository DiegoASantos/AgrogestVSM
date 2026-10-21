import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { createSuccessResponse } from "../../../common/http/api-response";
import { candidateReasons, normalizeIdentityText, type PersonaComparable } from "../domain/duplicado-productor";

type PersonRow = PersonaComparable & { address: string | null; lastContinuityConfirmationAt: Date | null; entityType: string; mergedIntoId: string | null; isActive: boolean };
type ParcelRow = { id: string; productorId: string; subsectorId: string; agronomistUserId: string | null; name: string | null; code: string; geometry: unknown; isActive: boolean; mergedIntoId: string | null; snapshot: string };
type CreditorRow = { id: string; productorId: string; documentType: string; documentNumber: string; bank: string; accountNumber: string; approvalStatus: string; mergedIntoId: string | null; snapshot: string };
type CaseRow = { id: string; lesserId: string; greaterId: string; status: string; reasons: string[] };
type Queryable = Pick<DataSource, "query"> | Pick<EntityManager, "query">;

const RELATION_TABLES = [
  "pagos_cosecha", "acreedores_cosecha", "registros_cosecha",
  "pago_productores", "fotos_comerciales_productor",
  "vinculos_productores_systrace"
] as const;

@Injectable()
export class DuplicadosProductoresService {
  constructor(private readonly dataSource: DataSource) {}

  async scanFor(productorId: string) {
    const person = await this.getPerson(this.dataSource, productorId);
    if (!person || person.entityType !== "persona" || person.mergedIntoId) return;
    const others = await this.getActivePersons();
    for (const other of others) {
      const reasons = candidateReasons(person, other);
      if (reasons.length) await this.insertCase(person.id, other.id, reasons);
    }
  }

  async scanExisting() {
    const people = await this.getActivePersons();
    let found = 0;
    for (let i = 0; i < people.length; i += 1) {
      for (let j = i + 1; j < people.length; j += 1) {
        const reasons = candidateReasons(people[i], people[j]);
        if (reasons.length) {
          await this.insertCase(people[i].id, people[j].id, reasons);
          found += 1;
        }
      }
    }
    return createSuccessResponse({ candidates: found });
  }

  async propose(firstId: string, secondId: string) {
    if (firstId === secondId) throw new BadRequestException("Selecciona dos fichas distintas.");
    const [first, second] = await Promise.all([
      this.getPerson(this.dataSource, firstId), this.getPerson(this.dataSource, secondId)
    ]);
    if (!first || !second || first.entityType !== "persona" || second.entityType !== "persona" ||
        first.mergedIntoId || second.mergedIntoId) {
      throw new BadRequestException("Solo se pueden comparar personas vigentes.");
    }
    const [lesser, greater] = BigInt(firstId) < BigInt(secondId)
      ? [firstId, secondId] : [secondId, firstId];
    await this.dataSource.query(`INSERT INTO productor_duplicado_casos
      (productor_menor_id, productor_mayor_id, motivos) VALUES ($1, $2, '["REVISION_MANUAL"]'::jsonb)
      ON CONFLICT (productor_menor_id, productor_mayor_id) DO UPDATE SET
        estado = 'PENDIENTE', motivos = EXCLUDED.motivos, actualizado_at = now(),
        resuelto_por_usuario_id = NULL
      WHERE productor_duplicado_casos.estado = 'DESCARTADO'`, [lesser, greater]);
    return createSuccessResponse({ proposed: true });
  }

  async list() {
    const rows = await this.dataSource.query(`
      SELECT c.id::text, c.productor_menor_id::text AS "lesserId",
             c.productor_mayor_id::text AS "greaterId", c.estado AS status,
             c.motivos AS reasons,
             TRIM(CONCAT_WS(' ', a.nombres, a.apellidos)) AS "lesserName",
             TRIM(CONCAT_WS(' ', b.nombres, b.apellidos)) AS "greaterName",
             NULLIF(TRIM(CONCAT_WS(' ', autor_a.nombres, autor_a.apellidos)), '') AS "lesserRecordedBy",
             NULLIF(TRIM(CONCAT_WS(' ', autor_b.nombres, autor_b.apellidos)), '') AS "greaterRecordedBy",
             c.creado_at AS "createdAt"
      FROM productor_duplicado_casos c
      JOIN productores a ON a.id = c.productor_menor_id
      JOIN productores b ON b.id = c.productor_mayor_id
      LEFT JOIN usuarios autor_a ON autor_a.id = a.creado_por_usuario_id
      LEFT JOIN usuarios autor_b ON autor_b.id = b.creado_por_usuario_id
      WHERE c.estado = 'PENDIENTE'
        AND a.fusionado_en_id IS NULL AND b.fusionado_en_id IS NULL
      ORDER BY c.creado_at DESC, c.id DESC LIMIT 200
    `) as Array<Record<string, unknown>>;
    return createSuccessResponse(rows);
  }

  async dismiss(caseId: string, userId: string) {
    const result = await this.dataSource.query(`
      UPDATE productor_duplicado_casos
      SET estado = 'DESCARTADO', actualizado_at = now(), resuelto_por_usuario_id = $2
      WHERE id = $1 AND estado = 'PENDIENTE' RETURNING id::text
    `, [caseId, userId]) as Array<{ id: string }>;
    if (!result.length) {
      const [existing] = await this.dataSource.query(`SELECT estado AS status
        FROM productor_duplicado_casos WHERE id = $1`, [caseId]) as Array<{ status: string }>;
      if (existing?.status !== "DESCARTADO") throw new NotFoundException("Caso no disponible.");
    }
    return createSuccessResponse({ dismissed: true });
  }

  async preview(caseId: string, principalId: string) {
    return createSuccessResponse(await this.buildPreview(this.dataSource, caseId, principalId));
  }

  async merge(input: {
    caseId: string;
    principalId: string;
    fingerprint: string;
    parcelMappings: Array<{ sourceParcelId: string; targetParcelId: string }>;
    creditorMappings: Array<{ sourceCreditorId: string; targetCreditorId: string }>;
    userId: string;
  }) {
    return this.dataSource.transaction("SERIALIZABLE", async (manager) => {
      const [completed] = await manager.query(`SELECT principal_id::text AS "principalId",
        secundario_id::text AS "secondaryId" FROM productor_unificaciones
        WHERE caso_id = $1`, [input.caseId]) as Array<{ principalId: string; secondaryId: string }>;
      if (completed) {
        if (completed.principalId !== input.principalId) {
          throw new ConflictException("El caso ya fue unificado con otra ficha principal.");
        }
        return createSuccessResponse(completed);
      }
      const preview = await this.buildPreview(manager, input.caseId, input.principalId, true);
      if (preview.fingerprint !== input.fingerprint) {
        throw new ConflictException("Los datos cambiaron. Revisa nuevamente la vista previa.");
      }
      const sourceId = preview.secondary.id;
      const targetId = preview.principal.id;
      const mapping = new Map(input.parcelMappings.map((row) => [row.sourceParcelId, row.targetParcelId]));
      if (mapping.size !== input.parcelMappings.length) throw new BadRequestException("Parcelas repetidas en la resolución.");
      const parcelSources = new Set(preview.possibleSameParcels.map((pair) => pair.sourceParcelId));
      for (const source of parcelSources) {
        const target = mapping.get(source);
        if (!target || !preview.possibleSameParcels.some((pair) =>
          pair.sourceParcelId === source && pair.targetParcelId === target)) {
          throw new ConflictException("Resuelve cada parcela posiblemente duplicada antes de unificar.");
        }
      }
      if (mapping.size !== parcelSources.size) throw new BadRequestException("Resolución de parcelas no solicitada.");
      const creditorMapping = new Map(input.creditorMappings.map((row) => [row.sourceCreditorId, row.targetCreditorId]));
      const creditorSources = new Set(preview.possibleSameCreditors.map((pair) => pair.sourceCreditorId));
      if (creditorMapping.size !== input.creditorMappings.length) throw new BadRequestException("Acreedores repetidos en la resolución.");
      for (const source of creditorSources) {
        const target = creditorMapping.get(source);
        if (!target || !preview.possibleSameCreditors.some((pair) =>
          pair.sourceCreditorId === source && pair.targetCreditorId === target)) {
          throw new ConflictException("Confirma cada acreedor repetido antes de unificar.");
        }
      }
      if (creditorMapping.size !== creditorSources.size) throw new BadRequestException("Resolución de acreedores no solicitada.");
      if (preview.conflicts.length) throw new ConflictException(preview.conflicts.join(" "));

      const manifest: Record<string, string[]> = {};
      const priorAliases = await manager.query(`SELECT id::text FROM productores
        WHERE fusionado_en_id = $1 ORDER BY id FOR UPDATE`, [sourceId]) as Array<{ id: string }>;
      manifest.productor_aliases = priorAliases.map((row) => row.id);
      for (const table of ["parcelas", ...RELATION_TABLES]) {
        const rows = await manager.query(`SELECT id::text FROM ${table} WHERE productor_id = $1 ORDER BY id FOR UPDATE`, [sourceId]) as Array<{ id: string }>;
        manifest[table] = rows.map((row) => row.id);
      }
      const sourceParcelIds = preview.sourceParcels.map((row) => row.id);
      const visits = sourceParcelIds.length
        ? await manager.query(`SELECT id::text FROM visitas_campo WHERE parcela_id = ANY($1::bigint[])
          ORDER BY id FOR UPDATE`, [sourceParcelIds]) as Array<{ id: string }>
        : [];
      manifest.visitas_campo = visits.map((row) => row.id);
      const invitations = await manager.query(`SELECT id::text FROM invitaciones_acreedor_productor
        WHERE productor_id = $1 ORDER BY id FOR UPDATE`, [sourceId]) as Array<{ id: string }>;
      manifest.invitaciones_acreedor_productor = invitations.map((row) => row.id);
      for (const [sourceParcelId, targetParcelId] of mapping) {
        const priorParcelAliases = await manager.query(`SELECT id::text FROM parcelas
          WHERE fusionada_en_id = $1 ORDER BY id FOR UPDATE`, [sourceParcelId]) as Array<{ id: string }>;
        manifest[`parcela_aliases_${sourceParcelId}`] = priorParcelAliases.map((row) => row.id);
        await manager.query("UPDATE visitas_campo SET parcela_id = $2 WHERE parcela_id = $1", [sourceParcelId, targetParcelId]);
        await manager.query("UPDATE parcelas SET fusionada_en_id = $2 WHERE fusionada_en_id = $1", [sourceParcelId, targetParcelId]);
        await manager.query(`UPDATE parcelas SET fusionada_en_id = $2, activo = false,
          actualizado_at = now() WHERE id = $1`, [sourceParcelId, targetParcelId]);
      }
      for (const [sourceCreditorId, targetCreditorId] of creditorMapping) {
        const priorCreditorAliases = await manager.query(`SELECT id::text FROM acreedores_cosecha
          WHERE fusionado_en_id = $1 ORDER BY id FOR UPDATE`, [sourceCreditorId]) as Array<{ id: string }>;
        manifest[`acreedor_aliases_${sourceCreditorId}`] = priorCreditorAliases.map((row) => row.id);
        for (const table of ["registros_cosecha", "revisiones_acreedor_cosecha", "detalle_pago_productores"]) {
          await manager.query(`UPDATE ${table} SET acreedor_id = $2 WHERE acreedor_id = $1`, [sourceCreditorId, targetCreditorId]);
        }
        await manager.query("UPDATE acreedores_cosecha SET fusionado_en_id = $2 WHERE fusionado_en_id = $1", [sourceCreditorId, targetCreditorId]);
        await manager.query(`UPDATE acreedores_cosecha SET fusionado_en_id = $2,
          actualizado_at = now() WHERE id = $1`, [sourceCreditorId, targetCreditorId]);
      }
      await manager.query(`UPDATE parcelas SET productor_id = $2, actualizado_at = now()
        WHERE productor_id = $1 AND fusionada_en_id IS NULL`, [sourceId, targetId]);
      for (const table of RELATION_TABLES) {
        await manager.query(`UPDATE ${table} SET productor_id = $2 WHERE productor_id = $1${table === "acreedores_cosecha" ? " AND fusionado_en_id IS NULL" : ""}`, [sourceId, targetId]);
      }
      await manager.query(`UPDATE invitaciones_acreedor_productor SET revocado_at = now()
        WHERE productor_id = $1 AND revocado_at IS NULL`, [sourceId]);
      if (!preview.principal.documentNumber && preview.secondary.documentNumber) {
        await manager.query(`UPDATE productores SET tipo_documento_id = NULL,
          nro_documento = NULL WHERE id = $1`, [sourceId]);
        await manager.query(`UPDATE productores SET tipo_documento_id = $2,
          nro_documento = $3 WHERE id = $1`, [targetId,
          preview.secondary.documentTypeId, preview.secondary.documentNumber]);
      }
      await manager.query(`UPDATE productores SET nombres = COALESCE(NULLIF(nombres, ''), $2),
        apellidos = COALESCE(NULLIF(apellidos, ''), $3),
        telefono = COALESCE(NULLIF(telefono, ''), $4),
        email = COALESCE(NULLIF(email, ''), $5),
        direccion = COALESCE(NULLIF(direccion, ''), $6),
        ultima_confirmacion_continuidad_at = GREATEST(
          ultima_confirmacion_continuidad_at,
          (SELECT ultima_confirmacion_continuidad_at FROM productores WHERE id = $7)
        ) WHERE id = $1`, [targetId,
        preview.secondary.firstName, preview.secondary.lastName,
        preview.secondary.phone, preview.secondary.email, preview.secondary.address, sourceId]);
      await manager.query(`UPDATE productores SET fusionado_en_id = $2, activo = false,
        actualizado_at = now() WHERE id = $1`, [sourceId, targetId]);
      await manager.query("UPDATE productores SET fusionado_en_id = $2 WHERE fusionado_en_id = $1", [sourceId, targetId]);
      await manager.query(`UPDATE productores SET activo = EXISTS (
        SELECT 1 FROM parcelas WHERE productor_id = $1 AND activo = true
      ), actualizado_at = now() WHERE id = $1`, [targetId]);
      await manager.query(`UPDATE productor_duplicado_casos SET estado = 'UNIFICADO',
        resuelto_por_usuario_id = $2, actualizado_at = now() WHERE id = $1`, [input.caseId, input.userId]);
      await manager.query(`INSERT INTO productor_unificaciones
        (caso_id, principal_id, secundario_id, usuario_id, manifiesto)
        VALUES ($1, $2, $3, $4, $5::jsonb)`, [
        input.caseId, targetId, sourceId, input.userId,
        JSON.stringify({ movedIds: manifest, parcelMappings: input.parcelMappings,
          creditorMappings: input.creditorMappings })
      ]);
      return createSuccessResponse({ principalId: targetId, secondaryId: sourceId });
    });
  }

  private async buildPreview(db: Queryable, caseId: string, principalId: string, lock = false) {
    const [caseRow] = await db.query(`SELECT id::text, productor_menor_id::text AS "lesserId",
      productor_mayor_id::text AS "greaterId", estado AS status, motivos AS reasons
      FROM productor_duplicado_casos WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`, [caseId]) as CaseRow[];
    if (!caseRow || caseRow.status !== "PENDIENTE") throw new NotFoundException("Caso no disponible.");
    if (principalId !== caseRow.lesserId && principalId !== caseRow.greaterId) {
      throw new BadRequestException("Ficha principal ajena al caso.");
    }
    const secondaryId = principalId === caseRow.lesserId ? caseRow.greaterId : caseRow.lesserId;
    const [principal, secondary] = await Promise.all([
      this.getPerson(db, principalId, lock), this.getPerson(db, secondaryId, lock)
    ]);
    if (!principal || !secondary || principal.entityType !== "persona" || secondary.entityType !== "persona" ||
        principal.mergedIntoId || secondary.mergedIntoId) {
      throw new ConflictException("Las fichas cambiaron o ya fueron unificadas.");
    }
    const [parcels, creditors] = await Promise.all([
      db.query(`SELECT id::text, productor_id::text AS "productorId",
        subsector_id::text AS "subsectorId", agronomo_usuario_id::text AS "agronomistUserId",
        nombre AS name, codigo AS code,
        CASE WHEN geometria IS NULL THEN NULL ELSE ST_AsGeoJSON(geometria)::json END AS geometry,
        activo AS "isActive", fusionada_en_id::text AS "mergedIntoId",
        md5(to_jsonb(parcelas)::text) AS snapshot
        FROM parcelas WHERE productor_id IN ($1, $2) ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [principalId, secondaryId]) as Promise<ParcelRow[]>,
      db.query(`SELECT id::text, productor_id::text AS "productorId",
        tipo_documento_acreedor AS "documentType", nro_documento_acreedor AS "documentNumber",
        banco AS bank, nro_cuenta AS "accountNumber", estado_aprobacion AS "approvalStatus",
        fusionado_en_id::text AS "mergedIntoId", md5(to_jsonb(acreedores_cosecha)::text) AS snapshot
        FROM acreedores_cosecha WHERE productor_id IN ($1, $2) ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [principalId, secondaryId]) as Promise<CreditorRow[]>
    ]);
    const relations: Record<string, number> = {};
    const relationSnapshots: Record<string, Array<{ id: string; snapshot: string }>> = {};
    for (const table of RELATION_TABLES) {
      const rows = await db.query(`SELECT id::text, md5(to_jsonb(t)::text) AS snapshot
        FROM ${table} t WHERE productor_id = $1 ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [secondaryId]) as Array<{ id: string; snapshot: string }>;
      relationSnapshots[table] = rows;
      relations[table] = rows.length;
    }
    const sourceParcels = parcels.filter((row) => row.productorId === secondaryId && !row.mergedIntoId);
    const targetParcels = parcels.filter((row) => row.productorId === principalId && !row.mergedIntoId);
    const visitRows = sourceParcels.length
      ? await db.query(`SELECT id::text, md5(to_jsonb(v)::text) AS snapshot FROM visitas_campo v
          WHERE parcela_id = ANY($1::bigint[]) ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [sourceParcels.map((row) => row.id)]) as Array<{ id: string; snapshot: string }>
      : [];
    relationSnapshots.visitas_campo = visitRows;
    relations.visitas_campo = visitRows.length;
    const invitationRows = await db.query(`SELECT id::text, md5(to_jsonb(i)::text) AS snapshot FROM invitaciones_acreedor_productor i
      WHERE productor_id = $1 ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [secondaryId]) as Array<{ id: string; snapshot: string }>;
    relationSnapshots.invitaciones_acreedor_productor = invitationRows;
    relations.invitaciones_acreedor_productor = invitationRows.length;
    const identityAliases = await db.query(`SELECT id::text, md5(to_jsonb(p)::text) AS snapshot
      FROM productores p WHERE fusionado_en_id = $1 ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [secondaryId]);
    const parcelAliases = sourceParcels.length
      ? await db.query(`SELECT id::text, md5(to_jsonb(p)::text) AS snapshot
          FROM parcelas p WHERE fusionada_en_id = ANY($1::bigint[]) ORDER BY id ${lock ? "FOR UPDATE" : ""}`,
          [sourceParcels.map((row) => row.id)])
      : [];
    const sourceCreditorIds = creditors.filter((row) => row.productorId === secondaryId && !row.mergedIntoId)
      .map((row) => row.id);
    const creditorAliases = sourceCreditorIds.length
      ? await db.query(`SELECT id::text, md5(to_jsonb(c)::text) AS snapshot
          FROM acreedores_cosecha c WHERE fusionado_en_id = ANY($1::bigint[])
          ORDER BY id ${lock ? "FOR UPDATE" : ""}`, [sourceCreditorIds])
      : [];
    const possibleSameParcels: Array<{ sourceParcelId: string; targetParcelId: string; name: string }> = [];
    for (const source of sourceParcels) {
      for (const target of targetParcels) {
        const sameName = source.subsectorId === target.subsectorId && source.name && target.name &&
          normalizeIdentityText(source.name) === normalizeIdentityText(target.name);
        const sameGeometry = source.geometry && target.geometry &&
          JSON.stringify(source.geometry) === JSON.stringify(target.geometry);
        if (sameName || sameGeometry) {
          possibleSameParcels.push({ sourceParcelId: source.id, targetParcelId: target.id,
            name: source.name ?? source.code });
        }
      }
    }
    const conflicts: string[] = [];
    for (const pair of possibleSameParcels) {
      const source = sourceParcels.find((row) => row.id === pair.sourceParcelId);
      const target = targetParcels.find((row) => row.id === pair.targetParcelId);
      if (source?.agronomistUserId && target?.agronomistUserId &&
          source.agronomistUserId !== target.agronomistUserId) {
        conflicts.push(`Las parcelas ${source.id} y ${target.id} tienen agrónomos distintos; resuelve la asignación antes de unificar.`);
      }
    }
    if (principal.documentNumber && secondary.documentNumber &&
        (principal.documentTypeId !== secondary.documentTypeId ||
          principal.documentNumber !== secondary.documentNumber)) {
      conflicts.push("Los documentos son distintos; corrige la contradicción antes de unificar.");
    }
    const possibleSameCreditors: Array<{ sourceCreditorId: string; targetCreditorId: string; bank: string; accountLast4: string }> = [];
    for (const source of creditors.filter((row) => row.productorId === secondaryId && !row.mergedIntoId)) {
      const sameDocument = creditors.filter((row) => row.productorId === principalId && !row.mergedIntoId &&
        row.documentType === source.documentType && row.documentNumber === source.documentNumber);
      for (const target of sameDocument) {
        if (source.bank === target.bank && source.accountNumber === target.accountNumber &&
            source.approvalStatus === target.approvalStatus) {
          possibleSameCreditors.push({ sourceCreditorId: source.id, targetCreditorId: target.id,
            bank: target.bank, accountLast4: target.accountNumber.slice(-4) });
        } else {
          conflicts.push(`El acreedor ${source.id} tiene datos o estado distintos en la ficha principal; revísalo antes de unificar.`);
        }
      }
    }
    const fingerprint = createHash("sha256").update(JSON.stringify({
      caseRow, principal, secondary, parcels, creditors, relationSnapshots,
      identityAliases, parcelAliases, creditorAliases
    })).digest("hex");
    const publicParcels = (items: ParcelRow[]) => items.map((row) => ({
      id: row.id, name: row.name, code: row.code
    }));
    return { principal, secondary, sourceParcels: publicParcels(sourceParcels),
      targetParcels: publicParcels(targetParcels), possibleSameParcels,
      possibleSameCreditors, conflicts, relations, fingerprint };
  }

  private async getPerson(db: Queryable, id: string, lock = false): Promise<PersonRow | null> {
    const [row] = await db.query(`SELECT id::text, entidad AS "entityType",
      nombres AS "firstName", apellidos AS "lastName", tipo_documento_id AS "documentTypeId",
      nro_documento AS "documentNumber", telefono AS phone, email, direccion AS address,
      activo AS "isActive", ultima_confirmacion_continuidad_at AS "lastContinuityConfirmationAt",
      fusionado_en_id::text AS "mergedIntoId"
      FROM productores WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`, [id]) as PersonRow[];
    return row ?? null;
  }

  private async getActivePersons(): Promise<PersonRow[]> {
    return this.dataSource.query(`SELECT id::text, entidad AS "entityType",
      nombres AS "firstName", apellidos AS "lastName", tipo_documento_id AS "documentTypeId",
      nro_documento AS "documentNumber", telefono AS phone, email, direccion AS address,
      activo AS "isActive", ultima_confirmacion_continuidad_at AS "lastContinuityConfirmationAt",
      fusionado_en_id::text AS "mergedIntoId"
      FROM productores WHERE entidad = 'persona' AND fusionado_en_id IS NULL ORDER BY id`) as Promise<PersonRow[]>;
  }

  private async insertCase(a: string, b: string, reasons: string[]) {
    const [lesser, greater] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
    await this.dataSource.query(`INSERT INTO productor_duplicado_casos
      (productor_menor_id, productor_mayor_id, motivos) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (productor_menor_id, productor_mayor_id) DO NOTHING`,
    [lesser, greater, JSON.stringify(reasons)]);
  }
}
