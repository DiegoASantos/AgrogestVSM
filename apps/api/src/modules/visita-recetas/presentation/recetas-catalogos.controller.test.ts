import { describe, expect, it, vi } from "vitest";

import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { RecetasCatalogosController } from "./recetas-catalogos.controller";

function repositoryReturning(items: unknown[]) {
  return { find: vi.fn().mockResolvedValue(items) };
}

function buildController(marcas: unknown[], fertilizantes: unknown[]) {
  const empty = repositoryReturning([]);
  return new RecetasCatalogosController(
    empty as never,
    empty as never,
    repositoryReturning(marcas) as never,
    empty as never,
    empty as never,
    empty as never,
    repositoryReturning(fertilizantes) as never
  );
}

function buildWritableController() {
  const empty = repositoryReturning([]);
  const ingredienteRepo = {
    ...repositoryReturning([]),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value)
  };
  const marcaRepo = {
    ...repositoryReturning([]),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value)
  };
  const fertilizanteRepo = {
    ...repositoryReturning([]),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value)
  };
  const controller = new RecetasCatalogosController(
    empty as never,
    ingredienteRepo as never,
    marcaRepo as never,
    empty as never,
    empty as never,
    empty as never,
    fertilizanteRepo as never
  );

  return { controller, ingredienteRepo, marcaRepo, fertilizanteRepo };
}

describe("RecetasCatalogosController", () => {
  it("keeps the legacy numeric brand concentration and exposes text with unit", async () => {
    const controller = buildController(
      [
        {
          id: "1",
          name: "Mertect 500 SC",
          tipoProductoId: "2",
          ingredienteActivoId: "3",
          ingredienteActivo: { name: "Thiabendazole" },
          concentracion: "500",
          unidadMedida: "g/L"
        },
        {
          id: "4",
          name: "Buffer P.H.",
          tipoProductoId: "5",
          ingredienteActivoId: "6",
          ingredienteActivo: null,
          concentracion: "Variado",
          unidadMedida: "L"
        },
        {
          id: "7",
          name: "Producto sin concentración",
          tipoProductoId: "8",
          ingredienteActivoId: "9",
          ingredienteActivo: null,
          concentracion: "   ",
          unidadMedida: null
        },
        {
          id: "10",
          name: "Producto cero",
          tipoProductoId: "11",
          ingredienteActivoId: "12",
          ingredienteActivo: null,
          concentracion: "0.0",
          unidadMedida: "%"
        }
      ],
      []
    );

    const result = await controller.getMarcasProducto();

    expect(result.data).toEqual([
      expect.objectContaining({
        concentracion: 500,
        concentracionTexto: "500",
        unidadMedida: "g/L"
      }),
      expect.objectContaining({
        concentracion: null,
        concentracionTexto: "Variado",
        unidadMedida: "L"
      }),
      expect.objectContaining({
        concentracion: null,
        concentracionTexto: "   ",
        unidadMedida: null
      }),
      expect.objectContaining({
        concentracion: 0,
        concentracionTexto: "0.0",
        unidadMedida: "%"
      })
    ]);
  });

  it("returns fertilizer concentration and measurement unit", async () => {
    const controller = buildController(
      [],
      [
        {
          id: "1",
          publicId: "fert-public-1",
          name: "DAP",
          type: "solido",
          concentracion: "18-46-00",
          unidadMedida: "%",
          isActive: true
        }
      ]
    );

    const result = await controller.getFertilizantes();

    expect(result.data).toEqual([
      {
        id: "1",
        publicId: "fert-public-1",
        name: "DAP",
        type: "solido",
        concentracion: "18-46-00",
        unidadMedida: "%",
        isActive: true
      }
    ]);
  });

  it("persists the mobile public id when creating a fertilizer", async () => {
    const { controller, fertilizanteRepo } = buildWritableController();
    fertilizanteRepo.findOne.mockResolvedValue(null);
    fertilizanteRepo.save.mockImplementation(async (value) => ({
      id: "42",
      isActive: true,
      ...value
    }));

    await controller.createFertilizante({
      publicId: "550e8400-e29b-41d4-a716-446655440000",
      name: "DAP",
      tipo: "solido",
      concentracion: "18-46-00",
      unidadMedida: "%"
    });

    expect(fertilizanteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: "550e8400-e29b-41d4-a716-446655440000"
      })
    );
  });

  it("returns the existing fertilizer for an idempotent retry", async () => {
    const { controller, fertilizanteRepo } = buildWritableController();
    fertilizanteRepo.findOne.mockResolvedValue({
      id: "42",
      publicId: "550e8400-e29b-41d4-a716-446655440000",
      name: "DAP",
      type: "solido",
      concentracion: "18-46-00",
      unidadMedida: "%",
      isActive: true
    });

    const result = await controller.createFertilizante({
      publicId: "550e8400-e29b-41d4-a716-446655440000",
      name: "DAP repetido",
      tipo: "solido"
    });

    expect(result.data.id).toBe("42");
    expect(fertilizanteRepo.create).not.toHaveBeenCalled();
    expect(fertilizanteRepo.save).not.toHaveBeenCalled();
  });

  it.each([
    "deactivateIngredienteActivo",
    "deactivateFertilizante",
    "deactivateMarcaProducto"
  ] as const)("restricts %s to ADMIN", (handler) => {
    expect(
      Reflect.getMetadata(
        REQUIRED_ROLES_KEY,
        RecetasCatalogosController.prototype[handler]
      )
    ).toEqual(["ADMIN"]);
  });

  it("soft-deactivates a fertilizer instead of deleting it", async () => {
    const { controller, fertilizanteRepo } = buildWritableController();
    const entity = {
      id: "42",
      publicId: "550e8400-e29b-41d4-a716-446655440000",
      name: "DAP",
      type: "solido",
      concentracion: "18-46-00",
      unidadMedida: "%",
      isActive: true
    };
    fertilizanteRepo.findOneOrFail.mockResolvedValue(entity);

    const result = await controller.deactivateFertilizante("42");

    expect(fertilizanteRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: "42", isActive: false })
    );
    expect(result.data.isActive).toBe(false);
  });
});
