import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";
import type { RefreshTokenPayload } from "../types/auth.types";

vi.mock("bcrypt", () => ({
  compare: vi.fn()
}));

import { compare } from "bcrypt";

type JwtServiceMock = {
  signAsync: ReturnType<typeof vi.fn>;
  verifyAsync: ReturnType<typeof vi.fn>;
};

type UsersServiceMock = {
  findByEmail: ReturnType<typeof vi.fn>;
  findByPublicIdWithRoles: ReturnType<typeof vi.fn>;
  isReady: ReturnType<typeof vi.fn>;
};

const ACCESS_SECRET = "test-access-secret-at-least-32-chars!!";
const REFRESH_SECRET = "test-refresh-secret-at-least-32-chars!!";

const appConfig = {
  auth: {
    accessSecret: ACCESS_SECRET,
    accessExpiresIn: "15m",
    refreshSecret: REFRESH_SECRET,
    refreshExpiresIn: "7d"
  }
};

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-id-1",
    publicId: "public-id-1",
    email: "admin@agrogest.pe",
    firstName: "Juan",
    lastName: "Perez",
    phone: null,
    isActive: true,
    passwordHash: "hash",
    userRoles: [
      {
        role: { id: 1, code: "ADMIN", name: "Admin", description: null }
      }
    ],
    ...overrides
  };
}

function buildService() {
  const jwt: JwtServiceMock = {
    signAsync: vi
      .fn()
      .mockImplementation((_payload, opts) =>
        Promise.resolve(
          opts?.secret === REFRESH_SECRET ? "refresh-token" : "access-token"
        )
      ),
    verifyAsync: vi.fn()
  };

  const users: UsersServiceMock = {
    findByEmail: vi.fn(),
    findByPublicIdWithRoles: vi.fn(),
    isReady: vi.fn().mockReturnValue(true)
  };

  const roles = { isReady: vi.fn().mockReturnValue(true) };
  const userRoles = { isReady: vi.fn().mockReturnValue(true) };

  const service = new AuthService(
    appConfig as never,
    jwt as never,
    users as never,
    roles as never,
    userRoles as never
  );

  return { service, jwt, users };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.mocked(compare).mockReset();
  });

  describe("login", () => {
    it("returns both access and refresh tokens on valid credentials", async () => {
      const { service, users, jwt } = buildService();
      users.findByEmail.mockResolvedValue(makeUser());
      vi.mocked(compare).mockResolvedValue(true as never);

      const response = await service.login({
        email: "admin@agrogest.pe",
        password: "pw"
      });

      expect(response.success).toBe(true);
      expect(response.data.accessToken).toBe("access-token");
      expect(response.data.refreshToken).toBe("refresh-token");
      expect(response.data.tokenType).toBe("Bearer");
      expect(response.data.expiresIn).toBe("15m");
      expect(response.data.refreshExpiresIn).toBe("7d");
      expect(response.data.user.email).toBe("admin@agrogest.pe");
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    });

    it("signs the access token with the access secret", async () => {
      const { service, users, jwt } = buildService();
      users.findByEmail.mockResolvedValue(makeUser());
      vi.mocked(compare).mockResolvedValue(true as never);

      await service.login({ email: "admin@agrogest.pe", password: "pw" });

      const accessCall = jwt.signAsync.mock.calls.find(
        ([, opts]) => opts?.secret === ACCESS_SECRET
      );
      expect(accessCall).toBeDefined();
      expect(accessCall?.[0]).toMatchObject({ sub: "public-id-1" });
    });

    it("signs the refresh token with the refresh secret and type=refresh", async () => {
      const { service, users, jwt } = buildService();
      users.findByEmail.mockResolvedValue(makeUser());
      vi.mocked(compare).mockResolvedValue(true as never);

      await service.login({ email: "admin@agrogest.pe", password: "pw" });

      const refreshCall = jwt.signAsync.mock.calls.find(
        ([, opts]) => opts?.secret === REFRESH_SECRET
      );
      expect(refreshCall).toBeDefined();
      expect(refreshCall?.[0]).toMatchObject({
        sub: "public-id-1",
        type: "refresh"
      });
    });

    it("rejects invalid email", async () => {
      const { service, users } = buildService();
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: "nope@x.com", password: "pw" })
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects inactive user", async () => {
      const { service, users } = buildService();
      users.findByEmail.mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.login({ email: "admin@agrogest.pe", password: "pw" })
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects wrong password", async () => {
      const { service, users } = buildService();
      users.findByEmail.mockResolvedValue(makeUser());
      vi.mocked(compare).mockResolvedValue(false as never);

      await expect(
        service.login({ email: "admin@agrogest.pe", password: "bad" })
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("issues a rotated pair when refresh token is valid", async () => {
      const { service, users, jwt } = buildService();
      const payload: RefreshTokenPayload = {
        sub: "public-id-1",
        type: "refresh"
      };
      jwt.verifyAsync.mockResolvedValue(payload);
      users.findByPublicIdWithRoles.mockResolvedValue(makeUser());

      const response = await service.refresh("incoming-refresh");

      expect(response.success).toBe(true);
      expect(response.data.accessToken).toBe("access-token");
      expect(response.data.refreshToken).toBe("refresh-token");
      expect(jwt.verifyAsync).toHaveBeenCalledWith("incoming-refresh", {
        secret: REFRESH_SECRET
      });
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    });

    it("rejects a token that fails signature verification", async () => {
      const { service, jwt } = buildService();
      jwt.verifyAsync.mockRejectedValue(new Error("jwt expired"));

      await expect(service.refresh("bad")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("rejects a token whose payload is not of type 'refresh'", async () => {
      const { service, jwt } = buildService();
      jwt.verifyAsync.mockResolvedValue({ sub: "public-id-1" });

      await expect(service.refresh("wrong-type")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("rejects an access token presented at the refresh endpoint", async () => {
      const { service, jwt } = buildService();
      jwt.verifyAsync.mockResolvedValue({
        sub: "public-id-1",
        userId: "user-id-1",
        email: "x@x.com",
        roles: ["ADMIN"]
      });

      await expect(service.refresh("access-as-refresh")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("rejects if the user no longer exists", async () => {
      const { service, users, jwt } = buildService();
      jwt.verifyAsync.mockResolvedValue({
        sub: "public-id-1",
        type: "refresh"
      });
      users.findByPublicIdWithRoles.mockResolvedValue(null);

      await expect(service.refresh("valid")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("rejects if the user is no longer active", async () => {
      const { service, users, jwt } = buildService();
      jwt.verifyAsync.mockResolvedValue({
        sub: "public-id-1",
        type: "refresh"
      });
      users.findByPublicIdWithRoles.mockResolvedValue(
        makeUser({ isActive: false })
      );

      await expect(service.refresh("valid")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("rejects a payload with non-string sub", async () => {
      const { service, jwt } = buildService();
      jwt.verifyAsync.mockResolvedValue({ sub: 123, type: "refresh" });

      await expect(service.refresh("odd")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });
});
