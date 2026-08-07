import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi.fn<(statement: string, ...params: unknown[]) => { changes: number }>().mockReturnValue({ changes: 1 })
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { tiposDocumentoRepository } from "./tipos-documento.repository";

describe("tiposDocumentoRepository", () => {
  beforeEach(() => { vi.clearAllMocks(); database.getAllSync.mockReturnValue([]); });

  describe("#obtenerTodos", () => {
    it("should query all tipos_documento ordered by id ASC", () => {
      database.getAllSync.mockReturnValue([{ id: 1, code: "DNI", name: "Documento Nacional de Identidad" }] as never);

      const result = tiposDocumentoRepository.obtenerTodos();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("DNI");
    });
  });

  describe("#obtenerPorId", () => {
    it("should find tipo documento by id", () => {
      database.getFirstSync.mockReturnValue({ id: 1, code: "DNI", name: "DNI" });

      expect(tiposDocumentoRepository.obtenerPorId(1)?.code).toBe("DNI");
    });

    it("should return null when not found", () => {
      database.getFirstSync.mockReturnValue(null);
      expect(tiposDocumentoRepository.obtenerPorId(999)).toBeNull();
    });
  });

  describe("#insertarVarios", () => {
    it("should insert multiple documentos with INSERT OR REPLACE", () => {
      tiposDocumentoRepository.insertarVarios([
        { id: 1, code: "DNI", name: "DNI" },
        { id: 2, code: "RUC", name: "RUC" }
      ]);

      expect(database.runSync).toHaveBeenCalledTimes(2);
    });
  });
});
