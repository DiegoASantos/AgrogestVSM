import { describe, expect, it } from "vitest";

import {
  buildAdminMapHref,
  emptyAdminMapFilters,
  readAdminMapQuery
} from "./map-query";

describe("buildAdminMapHref", () => {
  it("should return base mapas route when no params are provided", () => {
    const href = buildAdminMapHref();

    expect(href).toBe("/mapas");
  });

  it("should build URL with multiple filter params", () => {
    const href = buildAdminMapHref({
      productorId: "100",
      sectorId: "50",
      campaignId: "200"
    });

    expect(href).toContain("/mapas?");
    expect(href).toContain("productorId=100");
    expect(href).toContain("sectorId=50");
    expect(href).toContain("campaignId=200");
  });

  it("should persist multiple phenological stage filters", () => {
    const href = buildAdminMapHref({ phenologicalStageIds: ["stage-1", "labor-2"] });

    expect(href).toContain("phenologicalStageIds=stage-1%2Clabor-2");
  });

  it("should include visitaId selection param", () => {
    const href = buildAdminMapHref({ visitaId: "v1" });

    expect(href).toContain("visitaId=v1");
  });

  it("should skip empty string values", () => {
    const href = buildAdminMapHref({ productorId: "", sectorId: "50" });

    expect(href).not.toContain("productorId=");
    expect(href).toContain("sectorId=50");
  });

  it("should ignore the retired parcela filter", () => {
    const legacyInput = { productorId: "100", parcelaId: "50" };
    const href = buildAdminMapHref(legacyInput);

    expect(href).not.toContain("parcelaId=");
  });

  it("should return base route without query when all params are empty", () => {
    const href = buildAdminMapHref({ productorId: "" });

    expect(href).toBe("/mapas");
  });
});

describe("readAdminMapQuery", () => {
  it("should parse all filter and selection params from searchParams", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("productorId", "100");
    searchParams.set("sectorId", "50");
    searchParams.set("parcelaId", "25");
    searchParams.set("phenologicalStageIds", " stage-1, labor-2,stage-1 ");
    searchParams.set("visitaId", "v1");

    const result = readAdminMapQuery(searchParams);

    expect(result.filters.productorId).toBe("100");
    expect(result.filters.sectorId).toBe("50");
    expect(result.filters).not.toHaveProperty("parcelaId");
    expect(result.filters.phenologicalStageIds).toEqual(["stage-1", "labor-2"]);
    expect(result.selection.visitaId).toBe("v1");
  });

  it("should return empty strings for missing params", () => {
    const searchParams = new URLSearchParams();

    const result = readAdminMapQuery(searchParams);

    expect(result.filters.productorId).toBe("");
    expect(result.filters.sectorId).toBe("");
    expect(result.selection.visitaId).toBe("");
  });

  it("should trim whitespace from param values", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("productorId", "  100  ");

    const result = readAdminMapQuery(searchParams);

    expect(result.filters.productorId).toBe("100");
  });
});

describe("emptyAdminMapFilters", () => {
  it("should have all filter fields initialized to empty strings", () => {
    expect(emptyAdminMapFilters.productorId).toBe("");
    expect(emptyAdminMapFilters.sectorId).toBe("");
    expect(emptyAdminMapFilters.agronomistUserId).toBe("");
    expect(emptyAdminMapFilters.campaignId).toBe("");
    expect(emptyAdminMapFilters.phenologicalStageIds).toEqual([]);
    expect(emptyAdminMapFilters.startDate).toBe("");
    expect(emptyAdminMapFilters.endDate).toBe("");
  });
});
