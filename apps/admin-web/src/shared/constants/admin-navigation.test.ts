import { describe, expect, it } from "vitest";

import {
  adminMainNavigation,
  adminReportsNavigation,
  resolveAdminRouteMeta
} from "./admin-navigation";
import { adminRoutes } from "./site";

describe("admin report navigation", () => {
  it("registers report submodules outside the main links", () => {
    expect(adminMainNavigation.some((item) => item.href === adminRoutes.reportes)).toBe(
      false
    );
    expect(adminReportsNavigation.map((item) => item.href)).toEqual([
      adminRoutes.reportesItems.visitas,
      adminRoutes.reportesItems.camposPorEtapas,
      adminRoutes.reportesItems.parcelas
    ]);
    expect(resolveAdminRouteMeta(adminRoutes.reportesItems.visitas).label).toBe(
      "Visitas"
    );
    expect(resolveAdminRouteMeta(adminRoutes.reportesItems.camposPorEtapas).label).toBe(
      "Campos por etapas"
    );
    expect(resolveAdminRouteMeta(adminRoutes.reportesItems.parcelas).label).toBe(
      "Parcelas"
    );
  });
});
