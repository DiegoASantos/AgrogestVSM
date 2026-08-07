import { describe, expect, it, vi } from "vitest";

vi.mock("expo-crypto", () => ({
  randomUUID: vi.fn(() => "a1b2c3d4-e5f6-4890-abcd-ef1234567890")
}));

import { generateLocalId, generatePublicId, isUuid } from "./local-id";

describe("local-id", () => {
  describe("generateLocalId", () => {
    it("should return prefixed UUID", () => {
      expect(generateLocalId()).toBe("local_a1b2c3d4-e5f6-4890-abcd-ef1234567890");
    });
  });

  describe("generatePublicId", () => {
    it("should return UUID", () => {
      expect(generatePublicId()).toBe("a1b2c3d4-e5f6-4890-abcd-ef1234567890");
    });
  });

  describe("isUuid", () => {
    it("should return true for valid UUID", () => {
      expect(isUuid("a1b2c3d4-e5f6-4890-abcd-ef1234567890")).toBe(true);
    });

    it("should return false for invalid strings", () => {
      expect(isUuid("not-a-uuid")).toBe(false);
      expect(isUuid(null)).toBe(false);
      expect(isUuid(undefined)).toBe(false);
      expect(isUuid("")).toBe(false);
    });
  });
});
