import * as SecureStore from "expo-secure-store";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

export async function storeAuthTokens(tokens: StoredAuthTokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
  ]);
}

export async function loadAuthTokens(): Promise<StoredAuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function clearAuthTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  ]);
}

const LAST_LOGIN_EMAIL_KEY = "last_login_email";

export async function saveLastLoginEmail(email: string) {
  await SecureStore.setItemAsync(LAST_LOGIN_EMAIL_KEY, email);
}

export async function loadLastLoginEmail(): Promise<string | null> {
  const email = await SecureStore.getItemAsync(LAST_LOGIN_EMAIL_KEY);
  return email ?? null;
}
