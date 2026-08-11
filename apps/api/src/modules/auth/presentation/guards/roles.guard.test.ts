import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { RolesGuard } from "./roles.guard";
import { ALLOW_ANALYST_MUTATION_KEY } from "../decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../decorators/roles.decorator";

function makeContext(
  user: { roles?: string[] } | undefined,
  method = "GET"
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, method })
    }),
    getHandler: () => () => undefined,
    getClass: () => class {}
  } as unknown as ExecutionContext;
}

function makeReflector(
  requiredRoles: string[] | undefined,
  allowAnalystMutation = false
): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === REQUIRED_ROLES_KEY
        ? requiredRoles
        : key === ALLOW_ANALYST_MUTATION_KEY
          ? allowAnalystMutation
          : undefined
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
    expect(guard.canActivate(makeContext({ roles: ["VIEWER", "ADMIN"] }))).toBe(true);
  });

  it("throws ForbiddenException when user has none of the required roles", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext({ roles: ["VIEWER"] }))).toThrow(
      ForbiddenException
    );
  });

  it("throws ForbiddenException when user has no roles at all", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext({ roles: [] }))).toThrow(
      ForbiddenException
    );
  });

  it("throws ForbiddenException when request.user is missing", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"]));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it("allows ANALISTA to use safe read methods", () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext({ roles: ["ANALISTA"] }, "GET"))).toBe(true);
  });

  it("blocks ANALISTA from mutating requests without requiring each controller to opt in", () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(() =>
      guard.canActivate(makeContext({ roles: ["ANALISTA"] }, "PATCH"))
    ).toThrow(ForbiddenException);
  });

  it("keeps ADMIN access when a user also carries ANALISTA", () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(
      guard.canActivate(makeContext({ roles: ["ANALISTA", "ADMIN"] }, "DELETE"))
    ).toBe(true);
  });

  it("allows an explicitly approved ANALISTA mutation when the endpoint requires that role", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN", "ANALISTA"], true));

    expect(guard.canActivate(makeContext({ roles: ["ANALISTA"] }, "POST"))).toBe(true);
  });

  it("does not let the exception bypass endpoint roles", () => {
    const guard = new RolesGuard(makeReflector(["ADMIN"], true));

    expect(() => guard.canActivate(makeContext({ roles: ["ANALISTA"] }, "POST"))).toThrow(
      ForbiddenException
    );
  });

  it("does not allow an analyst mutation marker on an endpoint without roles", () => {
    const guard = new RolesGuard(makeReflector(undefined, true));

    expect(() => guard.canActivate(makeContext({ roles: ["ANALISTA"] }, "POST"))).toThrow(
      ForbiddenException
    );
  });
});
