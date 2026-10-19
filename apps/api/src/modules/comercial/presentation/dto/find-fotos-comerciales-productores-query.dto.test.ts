import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { FindFotosComercialesProductoresQueryDto } from "./find-fotos-comerciales-productores-query.dto";

describe("FindFotosComercialesProductoresQueryDto", () => {
  it("accepts pagination and trims a producer search", async () => {
    const query = plainToInstance(FindFotosComercialesProductoresQueryDto, {
      page: "1",
      limit: "20",
      search: "  García  "
    });

    expect(await validate(query)).toEqual([]);
    expect(query.search).toBe("García");
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it("rejects search terms longer than 100 characters", async () => {
    const query = plainToInstance(FindFotosComercialesProductoresQueryDto, {
      search: "a".repeat(101)
    });

    const errors = await validate(query);
    expect(errors.some((error) => error.property === "search")).toBe(true);
  });
});
