import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { RolesGuard } from "./roles.guard";

function makeContext(user: { roles?: string[] } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user })
    }),
    getHandler: () => () => undefined,
    getClass: () => class {}
  } as unknown as ExecutionContext;
}

function makeReflector(requiredRoles: string[] | undefined): Reflector {
  return {
    getAllAndOverride: () => requiredRoles
  } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("allows access when no roles are required", () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext({ roles: [] }))).toBe(true);
  });

  it("allows access when required roles array is empty", () => {
    const guard = new RolesGuard(makeReflector([]));
    expect(guard.canActivate(makeContext({ roles: [] }))).toBe(true);
  });

  it("allows access when user has at least one required role", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(guard.canActivate(makeContext({ roles: ["VIEWER", "ADMIN"] }))).toBe(
      true
    );
  });

  it("throws ForbiddenException when user has none of the required roles", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() =>
      guard.canActivate(makeContext({ roles: ["VIEWER"] }))
    ).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user has no roles at all", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext({ roles: [] }))).toThrow(
      ForbiddenException
    );
  });

  it("throws ForbiddenException when request.user is missing", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException
    );
  });
});
