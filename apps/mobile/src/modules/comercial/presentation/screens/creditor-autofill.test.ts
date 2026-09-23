import { describe, expect, it } from "vitest";

import type { Productor } from "../../../productores/types";
import { getCreditorAutofill } from "./creditor-autofill";

function makeProductor(overrides: Partial<Productor> = {}): Productor {
  return {
    id: "productor-1",
    publicId: "public-productor-1",
    entityType: "persona",
    documentTypeId: 1,
    documentNumber: "12345678",
    firstName: "MarÃ­a",
    lastName: "PÃ©rez",
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    serverId: "1",
    syncStatus: "synced",
    syncErrorMessage: null,
    ...overrides
  };
}

describe("getCreditorAutofill", () => {
  it("uses the registered DNI for a persona", () => {
    expect(getCreditorAutofill(makeProductor(), "DNI")).toEqual({
      firstName: "MarÃ­a",
      lastName: "PÃ©rez",
      documentType: "DNI",
      documentNumber: "12345678"
    });
  });

  it("uses the registered RUC when it is valid", () => {
    expect(
      getCreditorAutofill(
        makeProductor({ documentNumber: "20123456789" }),
        "RUC"
      )
    ).toMatchObject({ documentType: "RUC", documentNumber: "20123456789" });
  });

  it("requires manual creditor data for a non-person producer", () => {
    expect(
      getCreditorAutofill(makeProductor({ entityType: "fundo" }), "DNI")
    ).toBeNull();
  });

  it("requires manual creditor data when the producer document is incomplete", () => {
    expect(
      getCreditorAutofill(makeProductor({ documentNumber: "123" }), "DNI")
    ).toBeNull();
  });
});
