export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const storage = (
  globalThis as {
    localStorage?: {
      getItem: (key: string) => string | null;
      removeItem: (key: string) => void;
      setItem: (key: string, value: string) => void;
    };
  }
).localStorage;

export async function storeAuthTokens(tokens: StoredAuthTokens) {
  storage?.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function loadAuthTokens(): Promise<StoredAuthTokens | null> {
  const accessToken = storage?.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function clearAuthTokens() {
  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(REFRESH_TOKEN_KEY);
}

const LAST_LOGIN_EMAIL_KEY = "last_login_email";

export async function saveLastLoginEmail(email: string) {
  storage?.setItem(LAST_LOGIN_EMAIL_KEY, email);
}

export async function loadLastLoginEmail(): Promise<string | null> {
  return storage?.getItem(LAST_LOGIN_EMAIL_KEY) ?? null;
}
