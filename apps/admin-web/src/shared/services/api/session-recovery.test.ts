import { afterEach, describe, expect, it, vi } from "vitest";
import { apiDownload, apiRequest, setAuthorizationResolver, setUnauthorizedHandler } from "./client";
import { ApiError } from "./errors";

const headers = { Authorization: "Bearer expired", "X-Test": "preservar" };
const success = () => new Response(JSON.stringify({ success: true, data: { saved: true } }), { status: 200 });
const unauthorized = () => new Response(JSON.stringify({ success: false, error: { message: "Vencido", statusCode: 401 } }), { status: 401 });

afterEach(() => {
  setUnauthorizedHandler(null);
  setAuthorizationResolver(null);
  vi.unstubAllGlobals();
});

describe("Recuperación central de sesión HTTP", () => {
  it("espera el refresh y repite exactamente una vez conservando cuerpo y método", async () => {
    let finish!: (authorization: string) => void;
    const refreshed = new Promise<string>((resolve) => { finish = resolve; });
    const handler = vi.fn(() => refreshed);
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(success());
    vi.stubGlobal("fetch", fetchMock);
    const request = apiRequest("/pagos/productores", { method: "POST", headers, body: { amount: 12 } });
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith("Bearer expired"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish("Bearer renewed");
    await expect(request).resolves.toEqual({ saved: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toEqual({ ...fetchMock.mock.calls[0][1], headers: { ...fetchMock.mock.calls[0][1].headers, Authorization: "Bearer renewed" } });
  });

  it("resuelve el token vigente antes de enviar peticiones de un snapshot anterior", async () => {
    setAuthorizationResolver(() => "Bearer renewed");
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockResolvedValueOnce(success());
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/productores", { headers });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer renewed");
    expect(handler).not.toHaveBeenCalled();
  });

  it("no hace ciclos si el nuevo access también es rechazado", async () => {
    const handler = vi.fn().mockResolvedValueOnce("Bearer renewed").mockRejectedValueOnce(new ApiError("Revocada", 401));
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockImplementation(unauthorized);
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/productores", { headers })).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith("Bearer renewed", true);
  });

  it("no devuelve 401 a las pantallas si la renovación falla por red", async () => {
    setUnauthorizedHandler(vi.fn().mockRejectedValue(new ApiError("Temporal", 503)));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(unauthorized()));
    await expect(apiRequest("/productores", { headers })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("no repite una petición antigua si la sesión cambió al terminar el refresh", async () => {
    let valid = true;
    setAuthorizationResolver((authorization) => {
      if (!valid) throw new ApiError("La sesión cambió", 409);
      return authorization;
    });
    setUnauthorizedHandler(async () => { valid = false; return "Bearer renewed"; });
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized());
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/pagos/productores", { headers, method: "POST", body: {} })).rejects.toMatchObject({ statusCode: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 422, 500, 503])("no renueva ni repite operaciones que recibieron %s", async (status) => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/pagos/productores", { method: "POST", headers, body: {} })).rejects.toMatchObject({ statusCode: status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("no renueva tras fallo de transporte ni repite una mutación con resultado desconocido", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/pagos/productores", { method: "POST", headers, body: {} })).rejects.toThrow("Failed to fetch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("excluye auth/refresh y peticiones sin sesión de la recuperación", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(unauthorized));
    await expect(apiRequest("/auth/refresh", { method: "POST", body: { refreshToken: "fixture" }, recoverSession: false })).rejects.toMatchObject({ statusCode: 401 });
    await expect(apiRequest("/publico")).rejects.toMatchObject({ statusCode: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("recupera descargas preservando archivo y nombre", async () => {
    setUnauthorizedHandler(vi.fn().mockResolvedValue("Bearer renewed"));
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(new Response("pdf de prueba", { headers: { "content-disposition": 'attachment; filename="prueba.pdf"' } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await apiDownload("/pagos/productores/reporte-pdf", { headers });
    expect(result.fileName).toBe("prueba.pdf");
    expect(await result.blob.text()).toBe("pdf de prueba");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer renewed");
  });
});
