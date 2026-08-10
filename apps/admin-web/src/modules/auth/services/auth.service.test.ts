import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "./auth.service";

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function apiResponse(data: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify({ success: true, data, timestamp: "2026-06-17T00:00:00.000Z" }))
  };
}

function errorResponse(data: unknown, status = 400): FetchResponse {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify({ success: false, error: data, timestamp: "2026-06-17T00:00:00.000Z" }))
  };
}

function expectPostRequest(
  fetchMock: ReturnType<typeof vi.fn>,
  expectedPath: string,
  expectedBody: Record<string, unknown>
) {
  const calls = fetchMock.mock.calls;
  const found = calls.find(
    (call: unknown[]) => String(call[0]) === `http://127.0.0.1:3001${expectedPath}`
  );
  expect(found).toBeDefined();
  const [, init] = found!;
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual(expectedBody);
}

describe("authService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("#login", () => {
    it("should POST to /auth/login and fetch current user", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          accessToken: "access-1",
          refreshToken: "refresh-1",
          tokenType: "Bearer",
          expiresIn: "15m",
          refreshExpiresIn: "7d",
          user: { publicId: "pub-1", firstName: "Juan", lastName: "Perez", email: "juan@test.com", phone: null, isActive: true, roles: [{ id: 1, code: "ADMIN", name: "Admin" }] }
        }))
        .mockResolvedValueOnce(apiResponse({
          publicId: "pub-1", firstName: "Juan", lastName: "Perez", email: "juan@test.com", phone: null, isActive: true, roles: [{ id: 1, code: "ADMIN", name: "Admin" }]
        }));

      const result = await authService.login({ email: "juan@test.com", password: "pw" });

      expectPostRequest(fetchMock, "/auth/login", { email: "juan@test.com", password: "pw" });
      expect(result.accessToken).toBe("access-1");
      expect(result.refreshToken).toBe("refresh-1");
      expect(result.user.displayName).toBe("Juan Perez");
      expect(result.user.roles).toHaveLength(1);
    });

    it("should build displayName from email when name is missing", async () => {
      fetchMock
        .mockResolvedValueOnce(apiResponse({
          accessToken: "access-2", refreshToken: "r2", tokenType: "Bearer", expiresIn: "15m", refreshExpiresIn: "7d",
          user: { publicId: "pub-2", firstName: "", lastName: "", email: "admin@test.com", phone: null, isActive: true, roles: [] }
        }))
        .mockResolvedValueOnce(apiResponse({
          publicId: "pub-2", firstName: "", lastName: "", email: "admin@test.com", phone: null, isActive: true, roles: []
        }));

      const result = await authService.login({ email: "admin@test.com", password: "pw" });

      expect(result.user.displayName).toBe("admin");
    });
  });

  describe("#refresh", () => {
    it("should POST refresh token to /auth/refresh", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({
        accessToken: "new-access", refreshToken: "new-refresh", tokenType: "Bearer", expiresIn: "15m", refreshExpiresIn: "7d"
      }));

      const result = await authService.refresh("old-refresh-token");

      expectPostRequest(fetchMock, "/auth/refresh", { refreshToken: "old-refresh-token" });
      expect(result.accessToken).toBe("new-access");
    });
  });

  describe("#getCurrentUser", () => {
    it("should fetch /auth/me with auth header and map user", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({
        publicId: "pub-1", firstName: "Maria", lastName: "Garcia", email: "maria@test.com", phone: "999888777", isActive: true, roles: [{ id: 2, code: "AGRONOMO", name: "Agronomo" }]
      }));

      const result = await authService.getCurrentUser("token-1", "Bearer");

      const calls = fetchMock.mock.calls;
      const [url, init] = calls[0] as [string, { headers: Record<string, string> }];
      expect(String(url)).toBe("http://127.0.0.1:3001/auth/me");
      expect(init.headers.Authorization).toBe("Bearer token-1");
      expect(result.displayName).toBe("Maria Garcia");
      expect(result.email).toBe("maria@test.com");
    });

    it("should throw ApiError with custom message on 401", async () => {
      fetchMock.mockResolvedValueOnce(errorResponse({ message: "Unauthorized" }, 401));

      await expect(authService.getCurrentUser("bad-token")).rejects.toThrow("La sesion no es valida");
    });

    it("should re-throw non-401 errors", async () => {
      fetchMock.mockResolvedValueOnce(errorResponse({ message: "Server error" }, 500));

      await expect(authService.getCurrentUser("token")).rejects.toThrow();
    });
  });

  describe("#updateProfile", () => {
    function makeSession() {
      return {
        accessToken: "access-test-1",
        refreshToken: "refresh-test-1",
        tokenType: "Bearer",
        expiresIn: "15m",
        user: {
          publicId: "pub-1",
          email: "juan@test.com",
          firstName: "Juan",
          lastName: "Perez",
          phone: null,
          isActive: true,
          displayName: "Juan Perez",
          roles: [{ id: 1, code: "ADMIN", name: "Admin", description: null }]
        }
      };
    }

    it("should PATCH /auth/me with personal data and return mapped user", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({
        publicId: "pub-1", firstName: "Carlos", lastName: "Lopez", email: "carlos@test.com", phone: null, isActive: true, roles: [{ id: 1, code: "ADMIN", name: "Admin" }]
      }));

      const result = await authService.updateProfile(makeSession(), {
        firstName: "Carlos",
        lastName: "Lopez",
        email: "carlos@test.com",
        phone: "",
        newPassword: ""
      });

      const calls = fetchMock.mock.calls;
      const [url, init] = calls[0] as [string, { method: string; headers: Record<string, string>; body: string }];
      expect(String(url)).toBe("http://127.0.0.1:3001/auth/me");
      expect(init.method).toBe("PATCH");
      expect(init.headers.Authorization).toBe("Bearer access-test-1");

      const body = JSON.parse(init.body);
      expect(body.firstName).toBe("Carlos");
      expect(body.lastName).toBe("Lopez");
      expect(body.email).toBe("carlos@test.com");
      expect(body).not.toHaveProperty("phone");
      expect(body).not.toHaveProperty("newPassword");

      expect(result.firstName).toBe("Carlos");
      expect(result.displayName).toBe("Carlos Lopez");
    });

    it("should include phone when provided", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({
        publicId: "pub-1", firstName: "Juan", lastName: "Perez", email: "juan@test.com", phone: "999888777", isActive: true, roles: []
      }));

      await authService.updateProfile(makeSession(), {
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@test.com",
        phone: "999888777",
        newPassword: ""
      });

      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      const body = JSON.parse(init.body);
      expect(body.phone).toBe("999888777");
    });

    it("should include newPassword when provided", async () => {
      fetchMock.mockResolvedValueOnce(apiResponse({
        publicId: "pub-1", firstName: "Juan", lastName: "Perez", email: "juan@test.com", phone: null, isActive: true, roles: []
      }));

      await authService.updateProfile(makeSession(), {
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@test.com",
        phone: "",
        newPassword: "newsecret123"
      });

      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      const body = JSON.parse(init.body);
      expect(body.newPassword).toBe("newsecret123");
    });
  });
});
