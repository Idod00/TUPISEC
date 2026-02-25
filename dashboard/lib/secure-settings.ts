import { getSetting, setSetting } from "./db";
import { encryptValue, decryptValue, ENCRYPTED_KEYS } from "./crypto";

export async function getSecureSetting(key: string): Promise<string | null> {
  const value = await getSetting(key);
  if (value === null) return null;
  if (ENCRYPTED_KEYS.has(key)) return decryptValue(value);
  return value;
}

export async function setSecureSetting(key: string, value: string): Promise<void> {
  await setSetting(key, ENCRYPTED_KEYS.has(key) ? encryptValue(value) : value);
}
