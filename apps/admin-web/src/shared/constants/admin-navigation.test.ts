import { describe, expect, it } from "vitest";

import { adminMainNavigation, resolveAdminRouteMeta } from "./admin-navigation";
import { adminRoutes } from "./site";

describe("admin report navigation", () => {
  it("registers Reportes as a main route", () => {
    expect(adminMainNavigation).toContainEqual({
      label: "Reportes",
      href: adminRoutes.reportes,
      description: "Reportes del sistema"
    });
    expect(resolveAdminRouteMeta(adminRoutes.reportes).label).toBe("Reportes");
  });
});
