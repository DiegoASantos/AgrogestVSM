const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001";

declare const process: { env: Record<string, string | undefined> };

export function getApiBaseUrl() {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  return (envApiUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}
