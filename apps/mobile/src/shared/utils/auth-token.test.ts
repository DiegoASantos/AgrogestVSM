import { describe, expect, it, vi } from "vitest";

vi.mock("../../shared/services", () => ({
  ApiError: class extends Error { constructor(m: string) { super(m); this.name = "ApiError"; } }
}));

import { getUserIdFromAccessToken, isAccessTokenExpired } from "./auth-token";

function makeToken(payload: Record<string, unknown>): string {
  const enc = (s: string) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    for (let i = 0; i < s.length; i += 3) {
      const a = s.charCodeAt(i);
      const b = s.charCodeAt(i + 1);
      const c = s.charCodeAt(i + 2);
      result += chars[a >> 2];
      result += chars[((a & 3) << 4) | (b >> 4)];
      result += isNaN(b) ? "=" : chars[((b & 15) << 2) | (c >> 6)];
      result += isNaN(c) ? "=" : chars[c & 63];
    }
    return result;
  };
  return `header.${enc(JSON.stringify(payload))}.signature`;
}

describe("auth-token", () => {
  describe("getUserIdFromAccessToken", () => {
    it("should extract userId from token payload", () => {
      const token = makeToken({ userId: "123", exp: 9999999999 });
      expect(getUserIdFromAccessToken(token)).toBe("123");
    });

    it("should throw when payload has no userId", () => {
      const token = makeToken({ exp: 9999999999 });
      expect(() => getUserIdFromAccessToken(token)).toThrow("No se pudo identificar");
    });

    it("should throw for malformed tokens", () => {
      expect(() => getUserIdFromAccessToken("bad")).toThrow("no tiene un formato valido");
    });
  });

  describe("isAccessTokenExpired", () => {
    it("should return false when exp is in the future", () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      expect(isAccessTokenExpired(makeToken({ exp: future }))).toBe(false);
    });

    it("should return true when exp is in the past", () => {
      const past = Math.floor(Date.now() / 1000) - 60;
      expect(isAccessTokenExpired(makeToken({ exp: past }))).toBe(true);
    });

    it("should return false when exp is missing or invalid", () => {
      expect(isAccessTokenExpired(makeToken({}))).toBe(false);
    });
  });
});
