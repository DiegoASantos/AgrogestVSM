import "reflect-metadata";

import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { RolesGuard } from "../../auth/presentation/guards/roles.guard";
import { NotificacionesController } from "./notificaciones.controller";

function context(method: "GET" | "POST", roles: string[]): ExecutionContext {
  return {
    getClass: () => NotificacionesController,
    getHandler: () => method === "GET"
      ? NotificacionesController.prototype.list
      : NotificacionesController.prototype.markRead,
    switchToHttp: () => ({ getRequest: () => ({ method, user: { roles } }) })
  } as unknown as ExecutionContext;
}

describe("NotificacionesController authorization", () => {
  it("limits endpoints to admin and analyst and permits analyst to mark only their own read", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, NotificacionesController))
      .toEqual(["ADMIN", "ANALISTA"]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, NotificacionesController.prototype.markRead))
      .toBe(true);
  });

  it("enforces the role guard on both endpoints", () => {
    const guard = new RolesGuard(new Reflector());

    expect(() => guard.canActivate(context("GET", ["AGRONOMO"]))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context("POST", ["AGRONOMO"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context("POST", ["ANALISTA"]))).toBe(true);
    expect(guard.canActivate(context("GET", ["ADMIN"]))).toBe(true);
  });
});
