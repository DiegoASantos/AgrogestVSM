import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parcelasService } from "./parcelas/services/parcelas.service";
import { productoresService } from "./productores/services/productores.service";
import { securityService } from "./seguridad/services/security.service";

const session = {
  accessToken: "access-token",
  tokenType: "Bearer"
};

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function apiResponse(data: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          success: true,
          data,
          timestamp: "2026-06-17T00:00:00.000Z"
        })
      )
  };
}

function expectLastRequest(
  fetchMock: ReturnType<typeof vi.fn>,
  expected: {
    path: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];

  expect(String(url)).toBe(`http://127.0.0.1:3001${expected.path}`);
  expect(init).toMatchObject({
    method: expected.method,
    headers: expect.objectContaining({
      Authorization: "Bearer access-token"
    })
  });

  if (expected.body === undefined) {
    expect(init).not.toHaveProperty("body");
  } else {
    expect(JSON.parse(String(init.body))).toEqual(expected.body);
  }
}

describe("admin critical CRUD services", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses correct create/update/delete requests for productores", async () => {
    const payload = {
      publicId: "prod-public-1",
      documentTypeId: 1,
      documentNumber: "12345678",
      firstName: "Juan",
      lastName: "Perez",
      phone: "999999999",
      email: "juan@example.com",
      address: "Piura",
      isActive: true
    };
    const response = { id: "prod-1", ...payload };

    fetchMock.mockResolvedValue(apiResponse(response));

    await productoresService.create(session, payload);
    expectLastRequest(fetchMock, {
      path: "/productores",
      method: "POST",
      body: payload
    });

    await productoresService.update(session, "prod-1", {
      firstName: "Juan Carlos",
      phone: "988888888"
    });
    expectLastRequest(fetchMock, {
      path: "/productores/prod-1",
      method: "PATCH",
      body: {
        firstName: "Juan Carlos",
        phone: "988888888"
      }
    });

    await productoresService.remove(session, "prod-1");
    expectLastRequest(fetchMock, {
      path: "/productores/prod-1",
      method: "DELETE"
    });
  });

  it("uses correct create/update/delete requests for parcelas", async () => {
    const payload = {
      publicId: "parcela-public-1",
      productorId: "prod-1",
      sectorId: "sector-1",
      code: "P-001",
      name: "Parcela Norte",
      areaHectares: "1.50",
      description: "Mango Kent",
      referencePoint: {
        type: "Point" as const,
        coordinates: [-80.6328, -5.1945] as [number, number]
      },
      geometry: null,
      isActive: true
    };
    const response = { id: "parcela-1", ...payload };

    fetchMock.mockResolvedValue(apiResponse(response));

    await parcelasService.create(session, payload);
    expectLastRequest(fetchMock, {
      path: "/parcelas",
      method: "POST",
      body: payload
    });

    await parcelasService.update(session, "parcela-1", {
      name: "Parcela Norte editada",
      areaHectares: "1.75"
    });
    expectLastRequest(fetchMock, {
      path: "/parcelas/parcela-1",
      method: "PATCH",
      body: {
        name: "Parcela Norte editada",
        areaHectares: "1.75"
      }
    });

    await parcelasService.remove(session, "parcela-1");
    expectLastRequest(fetchMock, {
      path: "/parcelas/parcela-1",
      method: "DELETE"
    });
  });

  it("uses correct create/update/delete requests for users and roles", async () => {
    fetchMock.mockResolvedValue(apiResponse({ id: "user-1" }));

    await securityService.createUser(session, {
      email: "agronomo@example.com",
      password: "Temporal123!",
      firstName: "Ana",
      lastName: "Agronoma",
      isActive: true
    });
    expectLastRequest(fetchMock, {
      path: "/usuarios",
      method: "POST",
      body: {
        email: "agronomo@example.com",
        password: "Temporal123!",
        firstName: "Ana",
        lastName: "Agronoma",
        isActive: true
      }
    });

    await securityService.updateUser(session, "user-1", {
      email: "agronomo@example.com",
      firstName: "Ana Maria",
      lastName: "Agronoma",
      isActive: true
    });
    expectLastRequest(fetchMock, {
      path: "/usuarios/user-1",
      method: "PATCH",
      body: {
        email: "agronomo@example.com",
        firstName: "Ana Maria",
        lastName: "Agronoma",
        isActive: true
      }
    });

    await securityService.deleteUser(session, "user-1");
    expectLastRequest(fetchMock, {
      path: "/usuarios/user-1",
      method: "DELETE"
    });

    await securityService.createRole(session, {
      code: "GERENCIA",
      name: "GERENCIA",
      description: "Rol gerencial"
    });
    expectLastRequest(fetchMock, {
      path: "/roles",
      method: "POST",
      body: {
        code: "GERENCIA",
        name: "GERENCIA",
        description: "Rol gerencial"
      }
    });

    await securityService.updateRole(session, "role-1", {
      code: "GERENCIA",
      name: "GERENCIA",
      description: "Rol gerencial actualizado"
    });
    expectLastRequest(fetchMock, {
      path: "/roles/role-1",
      method: "PATCH",
      body: {
        code: "GERENCIA",
        name: "GERENCIA",
        description: "Rol gerencial actualizado"
      }
    });

    await securityService.deleteRole(session, "role-1");
    expectLastRequest(fetchMock, {
      path: "/roles/role-1",
      method: "DELETE"
    });
  });

  it("uses correct create/update/delete requests for user role assignments", async () => {
    fetchMock.mockResolvedValue(apiResponse({ id: "assignment-1" }));

    await securityService.createUserRole(session, {
      userId: "user-1",
      roleId: "role-1"
    });
    expectLastRequest(fetchMock, {
      path: "/usuario-roles",
      method: "POST",
      body: {
        userId: "user-1",
        roleId: "role-1"
      }
    });

    await securityService.updateUserRole(session, "user-1", "role-1", {
      userId: "user-1",
      roleId: "role-2"
    });
    expectLastRequest(fetchMock, {
      path: "/usuario-roles/user-1/role-1",
      method: "PATCH",
      body: {
        userId: "user-1",
        roleId: "role-2"
      }
    });

    await securityService.deleteUserRole(session, "user-1", "role-2");
    expectLastRequest(fetchMock, {
      path: "/usuario-roles/user-1/role-2",
      method: "DELETE"
    });
  });
});
