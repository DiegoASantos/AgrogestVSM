import { describe, expect, it, vi } from "vitest";

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
          name: "DAP",
          type: "solido",
          concentracion: "18-46-00",
          unidadMedida: "%"
        }
      ]
    );

    const result = await controller.getFertilizantes();

    expect(result.data).toEqual([
      {
        id: "1",
        name: "DAP",
        type: "solido",
        concentracion: "18-46-00",
        unidadMedida: "%"
      }
    ]);
  });
});
