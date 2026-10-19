import "reflect-metadata";

import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

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
  it("uses the internal user ID from the access token for persisted reads", () => {
    const service = {
      list: vi.fn(),
      markRead: vi.fn()
    };
    const controller = new NotificacionesController(service as never);
    const user = {
      sub: "08f7ce89-c638-4b4f-be43-711d4a3ca7da",
      userId: "1",
      email: "admin@example.test",
      roles: ["ADMIN"]
    };
    const dto = { productorId: "10", agronomoUsuarioId: "7", fechaVisita: "2026-10-17" };

    controller.list(user, "50", "0");
    controller.markRead(user, dto);

    expect(service.list).toHaveBeenCalledWith("1", "50", "0");
    expect(service.markRead).toHaveBeenCalledWith("1", dto);
  });

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
