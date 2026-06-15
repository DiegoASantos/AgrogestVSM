let apiToken: string | null = null;
let tokenRefreshHandler: (() => Promise<string | null>) | null = null;

export function setApiToken(token: string | null) {
  apiToken = token;
}

export function clearApiToken() {
  apiToken = null;
}

export function getApiToken() {
  return apiToken;
}

export function setTokenRefreshHandler(handler: (() => Promise<string | null>) | null) {
  tokenRefreshHandler = handler;
}

export function refreshApiToken() {
  return tokenRefreshHandler?.() ?? Promise.resolve(null);
}
