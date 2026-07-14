let apiToken: string | null = null;
type TokenRefreshOptions = {
  signal?: AbortSignal;
};

let tokenRefreshHandler:
  | ((options?: TokenRefreshOptions) => Promise<string | null>)
  | null = null;

export function setApiToken(token: string | null) {
  apiToken = token;
}

export function clearApiToken() {
  apiToken = null;
}

export function getApiToken() {
  return apiToken;
}

export function setTokenRefreshHandler(
  handler: ((options?: TokenRefreshOptions) => Promise<string | null>) | null
) {
  tokenRefreshHandler = handler;
}

export function refreshApiToken(options: TokenRefreshOptions = {}) {
  return tokenRefreshHandler?.(options) ?? Promise.resolve(null);
}
