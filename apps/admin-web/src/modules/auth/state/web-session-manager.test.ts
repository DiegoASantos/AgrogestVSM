import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/services/api/errors";
import type { AuthSession } from "../types/auth.types";
import { WebSessionManager } from "./web-session-manager";

const user = { publicId: "fixture-user", firstName: "Usuario", lastName: "Prueba", email: "test@example.local", phone: null, isActive: true, displayName: "Usuario Prueba", roles: [] };
const tokens = (version: string) => ({ accessToken: `access-${version}`, refreshToken: `refresh-${version}`, tokenType: "Bearer", expiresIn: "15m", refreshExpiresIn: "150d" });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  let stored: string | null = "refresh-0";
  const storage = { read: () => stored, write: vi.fn((token: string) => { stored = token; }), clear: vi.fn(() => { stored = null; }) };
  const onChange = vi.fn();
  const transport = {
    refresh: vi.fn().mockResolvedValue(tokens("1")),
    getCurrentUser: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue({ ...tokens("login"), user } as AuthSession)
  };
  const manager = new WebSessionManager(storage, onChange, transport);
  return { manager, storage, transport, onChange };
}

describe("WebSessionManager", () => {
  it("comparte restauración concurrente, incluyendo el doble efecto de desarrollo", async () => {
    const { manager, transport, storage, onChange } = setup();
    const first = manager.refreshUser();
    expect(manager.refreshUser()).toBe(first);
    await first;
    expect(transport.refresh).toHaveBeenCalledExactlyOnceWith("refresh-0");
    expect(storage.read()).toBe("refresh-1");
    expect(transport.getCurrentUser).toHaveBeenCalledWith("access-1", "Bearer", false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renueva una sola vez ante muchos 401 y conserva el snapshot de formularios", async () => {
    const { manager, transport, onChange } = setup();
    await manager.refreshUser();
    transport.refresh.mockResolvedValue(tokens("2"));
    expect(await Promise.all(Array.from({ length: 10 }, () => manager.recover("Bearer access-1"))))
      .toEqual(Array(10).fill("Bearer access-2"));
    expect(transport.refresh).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(manager.resolveAuthorization("Bearer access-1")).toBe("Bearer access-2");
    expect(await manager.recover("Bearer access-1")).toBe("Bearer access-2");
    expect(await manager.recover("Bearer access-1", true)).toBe("Bearer access-2");
    expect(transport.refresh).toHaveBeenCalledTimes(2);
  });

  it.each([new TypeError("Failed to fetch"), new ApiError("Temporal", 500), new ApiError("Temporal", 503)])("conserva la sesión ante fallo transitorio %s y permite recuperarla", async (error) => {
    const { manager, transport, storage, onChange } = setup();
    await manager.refreshUser();
    transport.refresh.mockRejectedValueOnce(error);
    await expect(manager.recover("Bearer access-1")).rejects.toMatchObject({ statusCode: 503 });
    expect(storage.read()).toBe("refresh-1");
    expect(storage.clear).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    transport.refresh.mockResolvedValue(tokens("2"));
    await expect(manager.recover("Bearer access-1")).resolves.toBe("Bearer access-2");
  });

  it("guarda el refresh rotado incluso si consultar el perfil falla", async () => {
    const { manager, transport, storage } = setup();
    transport.getCurrentUser.mockRejectedValueOnce(new ApiError("Temporal", 503));
    await expect(manager.refreshUser()).rejects.toMatchObject({ statusCode: 503 });
    expect(storage.read()).toBe("refresh-1");
    expect(storage.clear).not.toHaveBeenCalled();
    transport.refresh.mockResolvedValue(tokens("2"));
    await manager.refreshUser();
    expect(transport.refresh).toHaveBeenLastCalledWith("refresh-1");
  });

  it("cierra sesión si el refresh fue revocado o expiró", async () => {
    const { manager, transport, storage, onChange } = setup();
    await manager.refreshUser();
    transport.refresh.mockRejectedValueOnce(new ApiError("Revocado", 401));
    await expect(manager.recover("Bearer access-1")).rejects.toMatchObject({ statusCode: 401 });
    expect(storage.read()).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("cierra sesión si el nuevo access también recibe 401, sin otra rotación", async () => {
    const { manager, transport, storage } = setup();
    await manager.refreshUser();
    await expect(manager.recover("Bearer access-1", true)).rejects.toMatchObject({ statusCode: 401 });
    expect(transport.refresh).toHaveBeenCalledTimes(1);
    expect(storage.read()).toBeNull();
  });

  it("un refresh tardío no restaura una sesión cerrada explícitamente", async () => {
    const { manager, transport, storage, onChange } = setup();
    const pending = deferred<ReturnType<typeof tokens>>();
    transport.refresh.mockReturnValue(pending.promise);
    const refresh = manager.refreshUser();
    manager.logout();
    pending.resolve(tokens("late"));
    await expect(refresh).rejects.toMatchObject({ statusCode: 409 });
    expect(storage.read()).toBeNull();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("un 401 tardío de una sesión anterior no cierra una sesión nueva", async () => {
    const { manager, transport, storage, onChange } = setup();
    await manager.refreshUser();
    const pending = deferred<ReturnType<typeof tokens>>();
    transport.refresh.mockReturnValue(pending.promise);
    const refresh = manager.recover("Bearer access-1");
    await manager.login({ email: "test@example.local", password: "fixture" });
    pending.reject(new ApiError("Revocado", 401));
    await expect(refresh).rejects.toMatchObject({ statusCode: 409 });
    expect(storage.read()).toBe("refresh-login");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ accessToken: "access-login" }));
    expect(manager.resolveAuthorization("Bearer access-login")).toBe("Bearer access-login");
    await expect(manager.recover("Bearer access-1", true)).rejects.toMatchObject({ statusCode: 409 });
    expect(storage.read()).toBe("refresh-login");
  });

  it("publica cambios de permisos aunque no cambie la identidad", async () => {
    const { manager, transport, onChange } = setup();
    await manager.refreshUser();
    transport.getCurrentUser.mockResolvedValue({ ...user, roles: [{ id: 1, code: "ADMIN", name: "Admin", description: null }] });
    await manager.refreshUser();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].user.roles[0].code).toBe("ADMIN");
  });
});
