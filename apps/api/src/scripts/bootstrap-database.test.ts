import { describe, expect, it } from "vitest";

import { assertBootstrapAllowed } from "./bootstrap-database";

describe("assertBootstrapAllowed", () => {
  it("requires an explicit true confirmation", () => {
    expect(() => assertBootstrapAllowed(undefined)).toThrow(
      "ALLOW_DATABASE_BOOTSTRAP=true"
    );
    expect(() => assertBootstrapAllowed("false")).toThrow(
      "ALLOW_DATABASE_BOOTSTRAP=true"
    );
  });

  it("accepts a case-insensitive true value", () => {
    expect(() => assertBootstrapAllowed(" TRUE ")).not.toThrow();
  });
});
