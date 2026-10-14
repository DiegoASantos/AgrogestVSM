import "reflect-metadata";
import { BadRequestException, ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { RolesGuard } from "../../auth/presentation/guards/roles.guard";
import { DuplicadosProductoresController } from "./duplicados-productores.controller";

function context(handler: keyof DuplicadosProductoresController, method: "GET" | "POST", roles: string[]) {
  return {
    getClass: () => DuplicadosProductoresController,
    getHandler: () => DuplicadosProductoresController.prototype[handler],
    switchToHttp: () => ({ getRequest: () => ({ method, user: { roles } }) })
  } as unknown as ExecutionContext;
}

describe("DuplicadosProductoresController authorization", () => {
  it("restricts review to ADMIN and ANALISTA in the API guard", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, DuplicadosProductoresController))
      .toEqual(["ADMIN", "ANALISTA"]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, DuplicadosProductoresController.prototype.merge))
      .toBe(true);
    const guard = new RolesGuard(new Reflector());
    expect(() => guard.canActivate(context("list", "GET", ["AGRONOMO"]))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context("merge", "POST", ["AGRONOMO"]))).toThrow(ForbiddenException);
    expect(guard.canActivate(context("merge", "POST", ["ANALISTA"]))).toBe(true);
  });

  it("takes the audit actor from the token and rejects malformed mappings", () => {
    const service = { merge: vi.fn() };
    const controller = new DuplicadosProductoresController(service as never);
    const actor = { sub: "public-user", userId: "7", roles: ["ADMIN"] } as never;
    controller.merge("9", {
      principalId: "1", fingerprint: "a".repeat(64),
      parcelMappings: [{ sourceParcelId: "20", targetParcelId: "10" }],
      creditorMappings: []
    }, actor);
    expect(service.merge).toHaveBeenCalledWith(expect.objectContaining({ userId: "7" }));
    expect(() => controller.merge("9", {
      principalId: "1", fingerprint: "a".repeat(64),
      parcelMappings: [{ sourceParcelId: "20", targetParcelId: "bad" }],
      creditorMappings: []
    }, actor)).toThrow(BadRequestException);
  });
});
