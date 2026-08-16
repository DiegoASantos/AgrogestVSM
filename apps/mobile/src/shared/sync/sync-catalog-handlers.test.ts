import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../database/connection", () => ({
  getDatabase: vi.fn()
}));

vi.mock("../services", () => ({
  apiRequest: vi.fn(),
  apiRequestAllPages: vi.fn()
}));

vi.mock("../services/api/auth-store", () => ({
  getApiToken: () => "test-token"
}));

vi.mock("../utils/local-id", () => ({
  generatePublicId: () => "00000000-0000-4000-8000-000000000001",
  isUuid: () => true
}));

import { parcelasRepository } from "../../modules/parcelas/repositories/parcelas.repository";
import { parcelasRemote } from "../../modules/parcelas/services/parcelas.remote";
import { visitasCampoRepository } from "../../modules/visitas-campo/repositories/visitas-campo.repository";
import { visitasCampoRemote } from "../../modules/visitas-campo/services/visitas-campo.remote";
import { productoresRepository } from "../../modules/productores/repositories/productores.repository";
import { productoresRemote } from "../../modules/productores/services/productores.remote";
import {
  catalogoIngredientesActivosRepo,
  catalogoMarcasRepo
} from "../../modules/visita-recetas/repositories/catalogo-repository-helpers";
import { visitaRecetasRemote } from "../../modules/visita-recetas/services/visita-recetas.remote";
import { sectoresRepository } from "../../modules/sectores/repositories/sectores.repository";
import { subsectoresRepository } from "../../modules/subsectores/repositories/subsectores.repository";
import { subsectoresRemote } from "../../modules/subsectores/services/subsectores.remote";
import type { SyncOutboxItem } from "../database/sync-outbox";
import {
  handleMarcaProducto,
  handleParcela,
  handleProductor,
  handleSubsector,
  handleVisitaCampo
} from "./sync-handlers";

function makeEntry(overrides: Partial<SyncOutboxItem> = {}): SyncOutboxItem {
  return {
    id: 1,
    entityType: "productores",
    entityLocalId: "local-1",
    operation: "create",
    payload: null,
    retryCount: 0,
    createdAt: "2026-08-02T10:00:00.000Z",
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog sync handlers", () => {
  it("creates a productor, propagates cancellation context and stores its server id", async () => {
    const signal = new AbortController().signal;
    vi.spyOn(productoresRepository, "getById").mockReturnValue({
      id: "local-1",
      entityType: "persona",
      firstName: "Ana",
      lastName: "Perez",
      documentTypeId: 1,
      documentNumber: "12345678",
      phone: null,
      email: null,
      address: null,
      serverId: null
    } as never);
    const create = vi.spyOn(productoresRemote, "create").mockResolvedValue({
      id: "101"
    } as never);
    const update = vi.spyOn(productoresRepository, "update").mockImplementation(() => {});

    const result = await handleProductor(makeEntry(), { signal });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "persona",
        firstName: "Ana",
        documentNumber: "12345678"
      }),
      { signal }
    );
    expect(update).toHaveBeenCalledWith("local-1", {
      serverId: "101",
      syncStatus: "synced",
      syncErrorMessage: null
    });
    expect(result).toEqual({ status: "synced", serverId: "101" });
  });

  it("skips a subsector while its sector has no server id", async () => {
    vi.spyOn(subsectoresRepository, "getById").mockReturnValue({
      id: "sub-local",
      sectorId: "sector-local",
      serverId: null
    } as never);
    vi.spyOn(sectoresRepository, "getById").mockReturnValue({
      id: "sector-local",
      serverId: null
    } as never);
    const create = vi.spyOn(subsectoresRemote, "create");

    const result = await handleSubsector(
      makeEntry({ entityType: "subsectores", entityLocalId: "sub-local" })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped" });
  });

  it("resolves parent server ids before creating a parcela", async () => {
    const point = { type: "Point" as const, coordinates: [-80.6, -5.2] };
    vi.spyOn(parcelasRepository, "getById").mockReturnValue({
      id: "parcela-local",
      productorId: "productor-local",
      subsectorId: "subsector-local",
      serverId: null,
      name: "",
      areaHectares: null,
      description: null,
      referencePoint: point,
      parcelReferencePoint: point,
      isActive: true
    } as never);
    vi.spyOn(productoresRepository, "getById").mockReturnValue({
      id: "productor-local",
      serverId: "201"
    } as never);
    vi.spyOn(subsectoresRepository, "getById").mockReturnValue({
      id: "subsector-local",
      serverId: "301"
    } as never);
    const create = vi.spyOn(parcelasRemote, "create").mockResolvedValue({
      id: "401",
      publicId: "public-401",
      code: "PAR-401"
    } as never);
    const update = vi.spyOn(parcelasRepository, "update").mockImplementation(() => {});

    const result = await handleParcela(
      makeEntry({ entityType: "parcelas", entityLocalId: "parcela-local" })
    );

    expect(create).toHaveBeenCalledWith(
      {
        productorId: "201",
        subsectorId: "301",
        name: null,
        areaHectares: null,
        description: null,
        referencePoint: point,
        parcelReferencePoint: point,
        isActive: true
      },
      {}
    );
    expect(update).toHaveBeenCalledWith(
      "parcela-local",
      expect.objectContaining({
        serverId: "401",
        code: "PAR-401",
        publicId: "public-401",
        syncStatus: "synced"
      })
    );
    expect(result).toEqual({ status: "synced", serverId: "401" });
  });

  it("keeps a visit pending while its parcela activation has not synced", async () => {
    vi.spyOn(visitasCampoRepository, "getById").mockReturnValue({
      id: "visita-local",
      parcelaId: "parcela-local"
    } as never);
    vi.spyOn(parcelasRepository, "getById").mockReturnValue({
      id: "parcela-local",
      isActive: true,
      syncStatus: "error"
    } as never);
    const create = vi.spyOn(visitasCampoRemote, "create");

    const result = await handleVisitaCampo(
      makeEntry({
        entityType: "visitas_campo",
        entityLocalId: "visita-local"
      })
    );

    expect(result).toEqual({ status: "skipped" });
    expect(create).not.toHaveBeenCalled();
  });

  it("uses the delete payload after the local productor row was removed", async () => {
    const remove = vi.spyOn(productoresRemote, "remove").mockResolvedValue({} as never);

    const result = await handleProductor(
      makeEntry({
        operation: "delete",
        payload: JSON.stringify({ serverId: "501" })
      })
    );

    expect(remove).toHaveBeenCalledWith("501", {});
    expect(result).toEqual({ status: "synced", serverId: "501" });
  });

  it("resolves the active ingredient server id before creating a brand", async () => {
    vi.spyOn(catalogoMarcasRepo, "obtenerPorId").mockReturnValue({
      id: "marca-local",
      publicId: "marca-publica",
      name: "Marca Potasio",
      tipoProductoId: "2",
      ingredienteActivoId: "ingrediente-local",
      ingredienteActivoNombre: "Nitrato de potasio",
      concentracion: "46",
      unidadMedida: "%",
      serverId: null,
      syncStatus: "pending",
      syncErrorMessage: null
    });
    vi.spyOn(catalogoIngredientesActivosRepo, "obtenerPorId").mockReturnValue({
      id: "ingrediente-local",
      publicId: "ingrediente-publico",
      name: "Nitrato de potasio",
      description: null,
      serverId: "701",
      syncStatus: "synced",
      syncErrorMessage: null
    });
    const create = vi.spyOn(visitaRecetasRemote, "crearMarcaProducto").mockResolvedValue({
      id: "801"
    });
    const update = vi
      .spyOn(catalogoMarcasRepo, "actualizar")
      .mockImplementation(() => {});

    const result = await handleMarcaProducto(
      makeEntry({ entityType: "marcas_producto", entityLocalId: "marca-local" })
    );

    expect(create).toHaveBeenCalledWith({
      publicId: "marca-publica",
      name: "Marca Potasio",
      tipoProductoId: "2",
      ingredienteActivoId: "701",
      concentracion: "46",
      unidadMedida: "%"
    });
    expect(update).toHaveBeenCalledWith("marca-local", {
      serverId: "801",
      syncStatus: "synced",
      syncErrorMessage: null
    });
    expect(result).toEqual({ status: "synced", serverId: "801" });
  });

  it("keeps a brand pending while its active ingredient has no server id", async () => {
    vi.spyOn(catalogoMarcasRepo, "obtenerPorId").mockReturnValue({
      id: "marca-local",
      publicId: "marca-publica",
      name: "Marca Potasio",
      tipoProductoId: "2",
      ingredienteActivoId: "ingrediente-local",
      ingredienteActivoNombre: "Nitrato de potasio",
      concentracion: "46",
      unidadMedida: "%",
      serverId: null,
      syncStatus: "pending",
      syncErrorMessage: null
    });
    vi.spyOn(catalogoIngredientesActivosRepo, "obtenerPorId").mockReturnValue({
      id: "ingrediente-local",
      publicId: "ingrediente-publico",
      name: "Nitrato de potasio",
      description: null,
      serverId: null,
      syncStatus: "pending",
      syncErrorMessage: null
    });
    const create = vi.spyOn(visitaRecetasRemote, "crearMarcaProducto");

    const result = await handleMarcaProducto(
      makeEntry({ entityType: "marcas_producto", entityLocalId: "marca-local" })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped" });
  });
});
