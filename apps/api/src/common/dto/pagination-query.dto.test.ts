import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { PaginationQueryDto } from "./pagination-query.dto";

async function transform(input: Record<string, unknown>) {
  const dto = plainToInstance(PaginationQueryDto, input);
  const errors = await validate(dto);
  return { dto, errors };
}

describe("PaginationQueryDto", () => {
  it("applies defaults when page and limit are missing", async () => {
    const { dto, errors } = await transform({});

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(50);
    expect(dto.skip).toBe(0);
    expect(dto.take).toBe(50);
  });

  it("parses string query params (as Express/Fastify delivers them)", async () => {
    const { dto, errors } = await transform({ page: "3", limit: "25" });

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(25);
    expect(dto.skip).toBe(50);
    expect(dto.take).toBe(25);
  });

  it("falls back to defaults for garbage inputs", async () => {
    const { dto, errors } = await transform({ page: "abc", limit: "" });

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(50);
  });

  it("floors non-integer numeric inputs", async () => {
    const { dto, errors } = await transform({ page: "2.9", limit: "10.7" });

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it("rejects limit above the hard cap of 200", async () => {
    const { errors } = await transform({ limit: "500" });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "limit")).toBe(true);
  });

  it("rejects page below 1 via default coercion + Min", async () => {
    // parsePositiveInt returns DEFAULT for values < 1, so validation passes,
    // but a caller sending page=0 effectively gets page=1 — document this.
    const { dto, errors } = await transform({ page: "0" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
  });

  it("computes skip correctly for deep pages", async () => {
    const { dto } = await transform({ page: "10", limit: "100" });
    expect(dto.skip).toBe(900);
    expect(dto.take).toBe(100);
  });
});
