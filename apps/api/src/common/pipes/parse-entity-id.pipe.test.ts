import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { ParseEntityIdPipe } from "./parse-entity-id.pipe";

describe("ParseEntityIdPipe", () => {
  const pipe = new ParseEntityIdPipe();

  it("accepts a positive integer string", () => {
    expect(pipe.transform("42")).toBe("42");
  });

  it("trims surrounding whitespace", () => {
    expect(pipe.transform("  7  ")).toBe("7");
  });

  it.each(["0", "-1", "1.5", "abc", "", "  ", "01"])(
    "rejects invalid value %s",
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    }
  );

  it("rejects undefined/null coerced input", () => {
    // Nest may pass undefined for missing params
    expect(() => pipe.transform(undefined as unknown as string)).toThrow(
      BadRequestException
    );
    expect(() => pipe.transform(null as unknown as string)).toThrow(
      BadRequestException
    );
  });
});
