import { describe, expect, it } from "vitest";

import { harvestRecordSchema } from "./harvest-record.schema";

const validRecord = {
  productorId: "1",
  creditorId: "2",
  crateQuantity: 120,
  cratePrice: "12.50",
  registrationDate: "2026-09-24",
  harvestDate: "2026-09-23"
};

describe("harvestRecordSchema", () => {
  it("accepts whole crates, PEN price, and an earlier harvest date", () => {
    expect(harvestRecordSchema.safeParse(validRecord).success).toBe(true);
  });

  it("rejects fractional crates and a future harvest date", () => {
    expect(
      harvestRecordSchema.safeParse({
        ...validRecord,
        crateQuantity: 12.5,
        harvestDate: "2026-09-25"
      }).success
    ).toBe(false);
  });
});
