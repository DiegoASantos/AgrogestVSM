export function debugLog(scope: string, message: string, data?: unknown) {
  if (!__DEV__) {
    return;
  }

  const prefix = `[${scope}] ${message}`;

  if (typeof data === "undefined") {
    console.log(prefix);
    return;
  }

  console.log(prefix, data);
}
