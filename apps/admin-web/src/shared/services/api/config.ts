const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001";

export function getApiBaseUrl() {
  const envValue = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!envValue) {
    return DEFAULT_API_BASE_URL;
  }

  return envValue.replace(/\/+$/, "");
}
