import { describe, expect, it } from "vitest";

import { harvestPaymentSchema } from "./harvest-payment.schema";

const validInput = {
  productorId: "producer-local-1",
  creditorFirstName: "Maria Elena",
  creditorLastName: "Perez Lopez",
  creditorDocumentType: "DNI",
  creditorDocumentNumber: "12345678",
  bank: "BCP",
  accountNumber: "1912345678901234567890"
};

describe("harvestPaymentSchema", () => {
  it("accepts a DNI and a CCI up to 30 digits", () => {
    const result = harvestPaymentSchema.safeParse({
      ...validInput,
      accountNumber: "1".repeat(30)
    });

    expect(result.success).toBe(true);
  });

  it("accepts an 11 digit RUC", () => {
    const result = harvestPaymentSchema.safeParse({
      ...validInput,
      creditorDocumentType: "RUC",
      creditorDocumentNumber: "20123456789"
    });

    expect(result.success).toBe(true);
  });

  it.each([
    { creditorDocumentType: "DNI", creditorDocumentNumber: "1234567" },
    { creditorDocumentType: "RUC", creditorDocumentNumber: "2012345678" },
    { creditorDocumentType: "DNI", creditorDocumentNumber: "1234A678" },
    { accountNumber: "123A" },
    { accountNumber: "1".repeat(31) },
    { bank: "OTRO" }
  ])("rejects invalid payment data %#", (overrides) => {
    const result = harvestPaymentSchema.safeParse({ ...validInput, ...overrides });

    expect(result.success).toBe(false);
  });
});
