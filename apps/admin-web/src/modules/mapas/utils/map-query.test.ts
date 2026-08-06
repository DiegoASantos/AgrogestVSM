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

  it("should include visitaId selection param", () => {
    const href = buildAdminMapHref({ visitaId: "v1" });

    expect(href).toContain("visitaId=v1");
  });

  it("should skip empty string values", () => {
    const href = buildAdminMapHref({ productorId: "", sectorId: "50" });

    expect(href).not.toContain("productorId=");
    expect(href).toContain("sectorId=50");
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
    searchParams.set("visitaId", "v1");

    const result = readAdminMapQuery(searchParams);

    expect(result.filters.productorId).toBe("100");
    expect(result.filters.sectorId).toBe("50");
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
    expect(emptyAdminMapFilters.parcelaId).toBe("");
    expect(emptyAdminMapFilters.agronomistUserId).toBe("");
    expect(emptyAdminMapFilters.campaignId).toBe("");
    expect(emptyAdminMapFilters.startDate).toBe("");
    expect(emptyAdminMapFilters.endDate).toBe("");
  });
});
