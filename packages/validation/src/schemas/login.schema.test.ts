import { describe, expect, it } from "vitest";

import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "agronomo@agrogest.pe",
      password: "secret123"
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123"
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = loginSchema.safeParse({
      email: "a@b.co",
      password: "123"
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
