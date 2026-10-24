/// <reference types="node" />
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDatabase: vi.fn(), apiRequest: vi.fn(), localId: vi.fn() }));
vi.mock("../../../shared/database/connection", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../../../shared/database/catalog-session", () => ({ getCatalogSessionUserId: () => "user-1" }));
vi.mock("../../../shared/database/seed-catalogs", () => ({ forceRefreshAllCatalogs: vi.fn() }));
vi.mock("../../../shared/services/api/client", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("../../../shared/utils/local-id", () => ({ generateLocalId: () => mocks.localId() }));

import { SQL_SCHEMA } from "../../../shared/database/schema";
import { mobileRecoveryService } from "./mobile-recovery.service";

let NativeDatabase: typeof DatabaseSync | undefined;
try { ({ DatabaseSync: NativeDatabase } = await import("node:sqlite")); } catch { /* older local Node */ }
const dbs: DatabaseSync[] = [];

afterEach(() => { for (const db of dbs.splice(0)) db.close(); });

describe("mobile recovery SQLite import", () => {
  it.runIf(NativeDatabase)("persists server activities as synced, linked to local catalogs, without outbox entries", async () => {
    const raw = new NativeDatabase!(":memory:");
    dbs.push(raw);
    raw.exec("PRAGMA foreign_keys = OFF");
    for (const statement of SQL_SCHEMA) raw.exec(statement);
    raw.exec("CREATE TABLE sync_outbox (id INTEGER PRIMARY KEY, entity_type TEXT NOT NULL, entity_local_id TEXT NOT NULL)");
    raw.exec("PRAGMA foreign_keys = ON");
    raw.prepare(`INSERT INTO productores (id, public_id, server_id, first_name, last_name, is_active, created_at, updated_at,
      catalog_owner_user_id, catalog_visible) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1)`)
      .run("producer-local", "producer-public", "producer-remote", "Ana", "Rios", "2026-10-01", "2026-10-01", "user-1");

    const adapter = {
      getFirstSync<T>(sql: string, ...args: SQLInputValue[]) { return (raw.prepare(sql).get(...args) as T | undefined) ?? null; },
      getAllSync<T>(sql: string, ...args: SQLInputValue[]) { return raw.prepare(sql).all(...args) as T[]; },
      runSync(sql: string, ...args: SQLInputValue[]) { return raw.prepare(sql).run(...args); },
      withTransactionSync(callback: () => void) {
        raw.exec("BEGIN IMMEDIATE");
        try { callback(); raw.exec("COMMIT"); } catch (error) { raw.exec("ROLLBACK"); throw error; }
      }
    };
    mocks.getDatabase.mockReturnValue(adapter);
    mocks.localId.mockImplementation((() => { let next = 0; return () => `local-${++next}`; })());
    mocks.apiRequest.mockResolvedValue({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: { visita_comercial: 1, pago_cosecha: 1, registro_cosecha: 1 }, snapshot: "2026-10-30T00:00:00.000Z",
      items: [
        { type: "visita_comercial", id: "visit-remote", data: {
          publicId: "visit-public", productorId: "producer-remote", tipoSujeto: "PERSONA", nombres: "Ana",
          apellidos: "Rios", descripcion: "Visita recuperada", fechaVisita: "2026-10-20"
        } },
        { type: "pago_cosecha", id: "payment-remote", data: {
          publicId: "payment-public", productorId: "producer-remote", creditorFirstName: "Eva", creditorLastName: "Sol",
          creditorDocumentType: "DNI", creditorDocumentNumber: "12345678", bank: "BCP", accountNumber: "12345",
          createdAt: "2026-10-21T10:00:00.000Z", updatedAt: "2026-10-21T10:00:00.000Z"
        } },
        { type: "registro_cosecha", id: "harvest-remote", data: {
          publicId: "harvest-public", productorId: "producer-remote", creditorId: "creditor-remote", crateQuantity: 8,
          cratePrice: "12.50", registrationDate: "2026-10-22", harvestDate: "2026-10-21", creditorFirstName: "Eva",
          creditorLastName: "Sol", creditorDocumentType: "DNI", creditorDocumentNumber: "12345678", bank: "BCP",
          accountNumber: "12345", createdAt: "2026-10-22T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z",
          creditor: {
            id: "creditor-remote", publicId: "creditor-public", productorId: "producer-remote", creditorFirstName: "Eva",
            creditorLastName: "Sol", creditorDocumentType: "DNI", creditorDocumentNumber: "12345678", bank: "BCP",
            accountNumber: "12345", approvalStatus: "APPROVED", source: "MOBILE", reviewObservation: null,
            createdAt: "2026-10-22T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z"
          }
        } }
      ], nextCursor: "cursor-before"
    });

    await mobileRecoveryService.recoverPage("user-1");

    expect(raw.prepare("SELECT server_id, sync_status, productor_id FROM visitas_comerciales").get()).toEqual({
      server_id: "visit-remote", sync_status: "synced", productor_id: "producer-local"
    });
    expect(raw.prepare("SELECT count(*) AS total FROM sync_outbox").get()).toEqual({ total: 0 });
    expect(raw.prepare("SELECT server_id, sync_status FROM pagos_cosecha").get()).toEqual({ server_id: "payment-remote", sync_status: "synced" });
    expect(raw.prepare("SELECT server_id, sync_status FROM registros_cosecha").get()).toEqual({ server_id: "harvest-remote", sync_status: "synced" });
    expect(raw.prepare("SELECT server_id, sync_status, catalog_visible FROM acreedores_cosecha").get()).toEqual({
      server_id: "creditor-remote", sync_status: "synced", catalog_visible: 1
    });
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = ?").get("mobile_recovery_v1:cursor:user-1")).toEqual({ value: "cursor-before" });

    mocks.apiRequest.mockResolvedValueOnce({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: { visita_comercial: 2 }, snapshot: "2026-10-30T00:00:00.000Z",
      items: [
        { type: "visita_comercial", id: "visit-second", data: {
          publicId: "visit-second-public", productorId: "producer-remote", tipoSujeto: "PERSONA", nombres: "Ana",
          apellidos: "Rios", descripcion: "Debe revertirse", fechaVisita: "2026-10-21"
        } },
        { type: "visita_comercial", id: "visit-third", data: {
          publicId: "visit-third-public", productorId: "missing-producer", tipoSujeto: "PERSONA", nombres: "Ana",
          apellidos: "Rios", descripcion: "Falta dependencia", fechaVisita: "2026-10-22"
        } }
      ], nextCursor: null
    });
    await expect(mobileRecoveryService.recoverPage("user-1")).rejects.toThrow("Falta un catálogo necesario");
    expect(raw.prepare("SELECT count(*) AS total FROM visitas_comerciales").get()).toEqual({ total: 1 });
    expect(raw.prepare("SELECT value FROM app_meta WHERE key = ?").get("mobile_recovery_v1:cursor:user-1")).toEqual({ value: "cursor-before" });
  });

  it.runIf(NativeDatabase)("imports a technical visit and its staged evaluation atomically", async () => {
    const raw = new NativeDatabase!(":memory:");
    dbs.push(raw);
    raw.exec("PRAGMA foreign_keys = OFF");
    for (const statement of SQL_SCHEMA) raw.exec(statement);
    raw.exec("CREATE TABLE sync_outbox (id INTEGER PRIMARY KEY, entity_type TEXT NOT NULL, entity_local_id TEXT NOT NULL)");
    raw.prepare("INSERT INTO productores (id, public_id, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)")
      .run("producer", "producer-public", "2026-10-01", "2026-10-01");
    raw.prepare("INSERT INTO cultivos (id, code, name) VALUES (?, ?, ?)").run("crop", "CRP", "Cultivo");
    raw.prepare("INSERT INTO variedades (id, cultivo_id, code, name) VALUES (?, ?, ?, ?)").run("variety", "crop", "VAR", "Variedad");
    raw.prepare("INSERT INTO campanias (id, cultivo_id, name, start_date) VALUES (?, ?, ?, ?)").run("campaign", "crop", "Campaña", "2026-01-01");
    raw.prepare(`INSERT INTO sectores (id, public_id, distrito_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run("sector", "sector-public", "district", "Sector", "2026-10-01", "2026-10-01");
    raw.prepare(`INSERT INTO subsectores (id, public_id, sector_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run("subsector", "subsector-public", "sector", "Subsector", "2026-10-01", "2026-10-01");
    raw.prepare(`INSERT INTO parcelas (id, public_id, productor_id, subsector_id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("parcel", "parcel-public", "producer", "subsector", "PAR", "Parcela", "2026-10-01", "2026-10-01");
    raw.prepare("INSERT INTO etapas_fenologicas (id, cultivo_id, name) VALUES (?, ?, ?)").run("stage", "crop", "Etapa");
    raw.prepare("INSERT INTO sub_etapas (id, etapa_fenologica_id, name, sort_order) VALUES (?, ?, ?, ?)").run("substage", "stage", "Subetapa", 1);
    raw.exec("PRAGMA foreign_keys = ON");

    const adapter = {
      getFirstSync<T>(sql: string, ...args: SQLInputValue[]) { return (raw.prepare(sql).get(...args) as T | undefined) ?? null; },
      getAllSync<T>(sql: string, ...args: SQLInputValue[]) { return raw.prepare(sql).all(...args) as T[]; },
      runSync(sql: string, ...args: SQLInputValue[]) { return raw.prepare(sql).run(...args); },
      withTransactionSync(callback: () => void) {
        raw.exec("BEGIN IMMEDIATE");
        try { callback(); raw.exec("COMMIT"); } catch (error) { raw.exec("ROLLBACK"); throw error; }
      }
    };
    mocks.getDatabase.mockReturnValue(adapter);
    mocks.localId.mockImplementation((() => { let next = 0; return () => `technical-${++next}`; })());
    mocks.apiRequest.mockResolvedValue({
      window: { from: "2026-10-01", to: "2026-10-30", timeZone: "America/Lima" },
      counts: { visita_tecnica: 1 }, snapshot: "2026-10-30T00:00:00.000Z",
      items: [{ type: "visita_tecnica", id: "visit-server", data: {
        visita: {
          id: "visit-server", publicId: "visit-public", cropId: "crop", varietyId: "variety", parcelaId: "parcel",
          campaignId: "campaign", agronomistUserId: "user-1", nroFicha: null, plantsCount: null, areaHectares: null,
          sowingDate: null, visitDate: "2026-10-20", startVisitTime: "08:00", endVisitTime: null,
          phenologicalStageId: "stage", subEtapaId: "substage", phenologicalStages: [
            { phenologicalStageId: "stage", subEtapaId: "substage", coveragePercentage: 40, laborProgressPercentage: null }
          ], subEtapaPercentage: null, generalObservation: null, agronomistSignatureName: null,
          producerSignatureName: null, visitLocation: null, synchronizedAt: null, createdAt: null,
          updatedAt: null, isActive: true, technicalScoreVersion: 2
        },
        evaluaciones: [{ id: "evaluation-server", nutrientId: null, order: 0, incidencePercentage: null, percentage: "75", description: "Evaluación", organosAfectados: [] }],
        observacionesSanitarias: [], stepNotes: [], laboresCulturales: [], calificaciones: [], riego: null,
        receta: {
          id: "recipe-server", etapaFenologica: "stage", version: 1,
          mezclas: [{
            id: "mix-server", numero: 1, frecuenciaDosis: null, coadyuvantesIds: [], coadyuvantesDosis: {},
            ordenMezcla: [], volumenAplicacion: null, factor: "1", factorEditable: false, cantidadTotalProducto: null,
            productos: [{
              id: "product-server", productoRef: "remote-product", origen: "mezcla_directa", objetivo: null,
              objetivoNombre: null, enfoque: null, objetivoId: null, incidenciaGrado: null, severidadGrado: null,
              tipoControlId: null, tipoProductoId: null, disolvente: "Agua", modoAccionId: null,
              ingredienteActivoNombre: null, dosisProducto: null, unidadDosis: null, marcaProductoNombre: null,
              concentracionProducto: null, cantidadTotalProducto: null
            }]
          }], fitosanidad: [], fertilizacion: [], riego: { id: "recipe-irrigation", tipoRecomendacion: "riego_ligero" },
          labores: [{ id: "recipe-labor", labor: "poda_formacion" }]
        }
      } }], nextCursor: null
    });

    await mobileRecoveryService.recoverPage("user-1");

    expect(raw.prepare("SELECT server_id, sync_status, phenological_stage_id FROM visitas_campo").get()).toEqual({
      server_id: "visit-server", sync_status: "synced", phenological_stage_id: "stage"
    });
    expect(raw.prepare("SELECT server_id, sync_status, visita_local_id FROM visita_evaluaciones").get()).toMatchObject({
      server_id: "evaluation-server", sync_status: "synced"
    });
    expect(raw.prepare("SELECT count(*) AS total FROM visita_etapas_fenologicas").get()).toEqual({ total: 1 });
    expect(raw.prepare("SELECT sync_status FROM visita_recetas").get()).toEqual({ sync_status: "synced" });
    expect(raw.prepare("SELECT sync_status FROM visita_receta_mezcla").get()).toEqual({ sync_status: "synced" });
    expect(raw.prepare("SELECT sync_status FROM visita_receta_fitosanidad").get()).toEqual({ sync_status: "synced" });
    expect(raw.prepare("SELECT tipo_recomendacion FROM visita_receta_riego").get()).toEqual({ tipo_recomendacion: "riego_ligero" });
    expect(raw.prepare("SELECT labor FROM visita_receta_labores").get()).toEqual({ labor: "poda_formacion" });
    expect(raw.prepare("SELECT count(*) AS total FROM sync_outbox").get()).toEqual({ total: 0 });
  });
});
