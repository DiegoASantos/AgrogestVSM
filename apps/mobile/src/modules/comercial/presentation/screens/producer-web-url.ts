export const PRODUCTION_PRODUCTOR_WEB_URL =
  "http://190.119.191.195:5176/productor/acreedores";

export function isProducerWebUrlAllowed(url: string | undefined, isDev = __DEV__) {
  if (!url) return false;
  if (url.startsWith("https://")) return true;
  if (isDev && url.startsWith("http://")) return true;
  return !isDev && url === PRODUCTION_PRODUCTOR_WEB_URL;
}
