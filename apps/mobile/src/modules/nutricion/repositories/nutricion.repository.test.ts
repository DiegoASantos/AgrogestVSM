import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  execSync: vi.fn(),
  getAllSync: vi.fn(() => []),
  getFirstSync: vi.fn(),
  runSync: vi
    .fn<(statement: string, ...params: unknown[]) => { changes: number }>()
    .mockReturnValue({ changes: 1 }),
  withTransactionSync: vi.fn((callback: () => void) => callback())
}));

vi.mock("../../../shared/database/connection", () => ({
  getDatabase: () => database
}));

import { nutricionRepository } from "./nutricion.repository";

const nutrient = {
  id: "nutrient-new",
  cultivoId: "crop-1",
  code: "nitrogeno",
  name: "Nitrógeno",
  description: null,
  isActive: true,
  details: []
};

describe("nutricionRepository.insertNutrients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getFirstSync.mockReturnValue(null);
    database.withTransactionSync.mockImplementation((callback: () => void) => callback());
  });

  it("actualiza el catálogo sin borrar implícitamente el nutriente referenciado", () => {
    nutricionRepository.insertNutrients([nutrient], {
      ensureTables: false,
      useTransaction: false
    });

    const statements = database.runSync.mock.calls.map(([statement]) => statement);
    expect(statements.some((statement) => statement.includes("ON CONFLICT(id)"))).toBe(
      true
    );
    expect(
      statements.some((statement) =>
        statement.includes("INSERT OR REPLACE INTO nutrientes")
      )
    ).toBe(false);
  });

  it("remapea evaluaciones antes de retirar un ID de catálogo sustituido", () => {
    database.getFirstSync.mockReturnValue({ id: "nutrient-old" });

    nutricionRepository.insertNutrients([nutrient], {
      ensureTables: false,
      useTransaction: false
    });

    const statements = database.runSync.mock.calls.map(([statement]) => statement);
    const remapIndex = statements.findIndex((statement) =>
      statement.includes("UPDATE visita_evaluaciones SET nutrient_id")
    );
    const deleteIndex = statements.findIndex((statement) =>
      statement.includes("DELETE FROM nutrientes")
    );
    expect(remapIndex).toBeGreaterThanOrEqual(0);
    expect(deleteIndex).toBeGreaterThan(remapIndex);
  });
});
