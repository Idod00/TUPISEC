import { getSetting, setSetting } from "./db";
import { encryptValue, decryptValue, ENCRYPTED_KEYS } from "./crypto";

export function getSecureSetting(key: string): string | null {
  const value = getSetting(key);
  if (value === null) return null;
  if (ENCRYPTED_KEYS.has(key)) return decryptValue(value);
  return value;
}

export function setSecureSetting(key: string, value: string): void {
  setSetting(key, ENCRYPTED_KEYS.has(key) ? encryptValue(value) : value);
}
