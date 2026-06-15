import { ApiError } from "../services";

type AccessTokenPayload = {
  userId?: string | number;
  exp?: number;
};

export function getUserIdFromAccessToken(accessToken: string) {
  const payload = parseAccessTokenPayload(accessToken);

  if (!payload?.userId) {
    throw new ApiError("No se pudo identificar el usuario autenticado.");
  }

  return String(payload.userId);
}

export function isAccessTokenExpired(accessToken: string) {
  const payload = parseAccessTokenPayload(accessToken);

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return false;
  }

  return Date.now() >= payload.exp * 1000;
}

function parseAccessTokenPayload(accessToken: string) {
  const tokenParts = accessToken.split(".");

  if (tokenParts.length < 2) {
    throw new ApiError("El token de sesion no tiene un formato valido.");
  }

  try {
    const payload = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, "=");

    const decodeBase64 = (
      globalThis as {
        atob?: (value: string) => string;
      }
    ).atob;

    if (!decodeBase64) {
      throw new ApiError("El entorno actual no puede leer el token de sesion.");
    }

    const decodedPayload = decodeBase64(payload);
    return JSON.parse(decodedPayload) as AccessTokenPayload;
  } catch {
    throw new ApiError("No se pudo leer el token de sesion.");
  }
}
