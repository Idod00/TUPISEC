import crypto from "crypto";

const SECRET = process.env.TUPISEC_SECRET || "tupisec-default-key-change-me-please";
const ENC_PREFIX = "ENC:v1:";

let _masterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (!_masterKey) {
    _masterKey = crypto.pbkdf2Sync(SECRET, "tupisec-salt-v1", 100000, 32, "sha512");
  }
  return _masterKey;
}

export function encryptValue(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptValue(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value;
  const parts = value.slice(ENC_PREFIX.length).split(":");
  if (parts.length !== 3) return value;
  const [ivHex, authTagHex, ciphertextHex] = parts;
  try {
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return value;
  }
}

export const ENCRYPTED_KEYS = new Set(["virustotal_api_key", "shodan_api_key", "smtp_pass"]);

export function createSessionToken(userId: string, role: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const hmac = crypto.createHmac("sha256", SECRET + ":session")
    .update(`${userId}|${role}|${timestamp}|${nonce}`)
    .digest("hex");
  return `${userId}|${role}|${timestamp}|${nonce}|${hmac}`;
}

export function verifySessionToken(token: string): { userId: string; role: string } | null {
  const parts = token.split("|");
  if (parts.length !== 5) return null;
  const [userId, role, timestamp, nonce, mac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() / 1000 - ts > 86400 * 7) return null;
  const expected = crypto.createHmac("sha256", SECRET + ":session")
    .update(`${userId}|${role}|${timestamp}|${nonce}`)
    .digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(mac, "hex"))) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function createApiToken(): { token: string; prefix: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(24).toString("hex");
  const hmac = crypto.createHmac("sha256", SECRET + ":api-token")
    .update(`${timestamp}:${nonce}`)
    .digest("hex");
  const token = `tupisec_api_${timestamp}_${nonce}_${hmac}`;
  const prefix = token.slice(0, 24);
  return { token, prefix };
}

export function validateApiToken(token: string): boolean {
  if (!token.startsWith("tupisec_api_")) return false;
  const rest = token.slice("tupisec_api_".length);
  const parts = rest.split("_");
  if (parts.length < 3) return false;
  const hmac = parts[parts.length - 1];
  const nonce = parts[parts.length - 2];
  const timestamp = parts[parts.length - 3];
  const ts = parseInt(timestamp, 10);
  // Tokens valid for 365 days
  if (isNaN(ts) || Date.now() / 1000 - ts > 86400 * 365) return false;
  const expected = crypto.createHmac("sha256", SECRET + ":api-token")
    .update(`${timestamp}:${nonce}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}
