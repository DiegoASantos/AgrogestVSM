import * as Crypto from "expo-crypto";

export function generateLocalId() {
  return `local_${Crypto.randomUUID()}`;
}

export function generatePublicId() {
  return Crypto.randomUUID();
}

export function isUuid(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
