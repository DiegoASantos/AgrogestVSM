import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import type { UsersService } from "../../../users/application/users.service";
import { AccessTokenGuard } from "./access-token.guard";

type UserStub = { publicId: string; isActive: boolean };

function makeContext(authorization?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: authorization ? { authorization } : {}
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
    _request: request
  } as unknown as ExecutionContext & { _request: Record<string, unknown> };
}

function makeGuard(options: {
  isPublic?: boolean;
  verifyAsync?: ReturnType<typeof vi.fn>;
  findByPublicId?: ReturnType<typeof vi.fn>;
}) {
  const reflector = {
    getAllAndOverride: () => options.isPublic ?? false
  } as unknown as Reflector;

  const jwtService = {
    verifyAsync: options.verifyAsync ?? vi.fn()
  } as unknown as JwtService;

  const usersService = {
    findByPublicId: options.findByPublicId ?? vi.fn()
  } as unknown as UsersService;

  return new AccessTokenGuard(jwtService, reflector, usersService);
}

const validPayload = {
  sub: "user-uuid",
  userId: "1",
  email: "u@test",
  roles: ["ADMIN"]
};

describe("AccessTokenGuard", () => {
  it("allows access to public routes without a token", async () => {
    const guard = makeGuard({ isPublic: true });
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it("throws UnauthorizedException when Authorization header is missing", async () => {
    const guard = makeGuard({});
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("throws UnauthorizedException when Authorization scheme is not Bearer", async () => {
    const guard = makeGuard({});
    await expect(
      guard.canActivate(makeContext("Basic abc123"))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when token verification fails", async () => {
    const guard = makeGuard({
      verifyAsync: vi.fn().mockRejectedValue(new Error("bad sig"))
    });
    await expect(
      guard.canActivate(makeContext("Bearer garbage"))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when payload shape is invalid", async () => {
    const guard = makeGuard({
      verifyAsync: vi.fn().mockResolvedValue({ sub: "x" })
    });
    await expect(
      guard.canActivate(makeContext("Bearer anything"))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when user does not exist", async () => {
    const guard = makeGuard({
      verifyAsync: vi.fn().mockResolvedValue(validPayload),
      findByPublicId: vi.fn().mockResolvedValue(null)
    });
    await expect(
      guard.canActivate(makeContext("Bearer anything"))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when user is inactive", async () => {
    const guard = makeGuard({
      verifyAsync: vi.fn().mockResolvedValue(validPayload),
      findByPublicId: vi
        .fn()
        .mockResolvedValue({ publicId: "user-uuid", isActive: false } as UserStub)
    });
    await expect(
      guard.canActivate(makeContext("Bearer anything"))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("allows access and attaches the payload to the request for a valid token", async () => {
    const findByPublicId = vi
      .fn()
      .mockResolvedValue({ publicId: "user-uuid", isActive: true } as UserStub);
    const guard = makeGuard({
      verifyAsync: vi.fn().mockResolvedValue(validPayload),
      findByPublicId
    });
    const ctx = makeContext("Bearer goodtoken");

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(findByPublicId).toHaveBeenCalledWith("user-uuid");
    const request = (ctx as unknown as { _request: { user?: unknown } })._request;
    expect(request.user).toEqual(validPayload);
  });
});
