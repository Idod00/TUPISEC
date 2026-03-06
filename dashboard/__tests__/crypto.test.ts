import { describe, it, expect } from "vitest";
import {
  encryptValue,
  decryptValue,
  createSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
  createApiToken,
  validateApiToken,
  ENCRYPTED_KEYS,
} from "../lib/crypto";

describe("encrypt/decrypt", () => {
  it("roundtrips a plaintext value", () => {
    const plain = "my-secret-api-key-123";
    const encrypted = encryptValue(plain);
    expect(encrypted).toContain("ENC:v1:");
    expect(decryptValue(encrypted)).toBe(plain);
  });

  it("returns non-encrypted values as-is", () => {
    expect(decryptValue("plain-text")).toBe("plain-text");
  });

  it("returns malformed encrypted values as-is", () => {
    expect(decryptValue("ENC:v1:bad")).toBe("ENC:v1:bad");
  });
});

describe("session tokens", () => {
  it("creates and verifies a valid token", () => {
    const token = createSessionToken("user-1", "admin");
    const result = verifySessionToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
    expect(result!.role).toBe("admin");
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken("user-1", "admin");
    const tampered = token.slice(0, -4) + "0000";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken("a|b|c")).toBeNull();
  });
});

describe("password hashing", () => {
  it("verifies correct password", () => {
    const { hash, salt } = hashPassword("correct-horse-battery");
    expect(verifyPassword("correct-horse-battery", hash, salt)).toBe(true);
  });

  it("rejects wrong password", () => {
    const { hash, salt } = hashPassword("correct-horse-battery");
    expect(verifyPassword("wrong-password", hash, salt)).toBe(false);
  });
});

describe("API tokens", () => {
  it("creates and validates a token", () => {
    const { token } = createApiToken();
    expect(token.startsWith("tupisec_api_")).toBe(true);
    expect(validateApiToken(token)).toBe(true);
  });

  it("rejects invalid tokens", () => {
    expect(validateApiToken("not_a_token")).toBe(false);
    expect(validateApiToken("tupisec_api_bad")).toBe(false);
  });
});

describe("ENCRYPTED_KEYS", () => {
  it("includes expected sensitive keys", () => {
    expect(ENCRYPTED_KEYS.has("virustotal_api_key")).toBe(true);
    expect(ENCRYPTED_KEYS.has("shodan_api_key")).toBe(true);
    expect(ENCRYPTED_KEYS.has("smtp_pass")).toBe(true);
  });
});
