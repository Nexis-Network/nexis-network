import "server-only";

import crypto from "crypto";

const KEY_ENV = "NEXIS_CONSOLE_ENCRYPTION_KEY";
const VERSION_PREFIX = "v1";

function decodeKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32) return buf;
  } catch {
    return null;
  }
  return null;
}

export function getEncryptionKey(): Buffer | null {
  const raw = process.env[KEY_ENV];
  if (!raw) return null;
  return decodeKey(raw);
}

export function requireEncryptionKey(): Buffer {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      `Missing ${KEY_ENV}. Provide a 32-byte base64 or 64-char hex key to store secrets.`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = requireEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION_PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(
    ":",
  );
}

export function decryptSecret(payload: string): string {
  const key = requireEncryptionKey();
  const [version, ivB64, tagB64, encryptedB64] = payload.split(":");
  if (version !== VERSION_PREFIX || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid secret payload.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskSecret(value: string, visible = 4) {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= visible * 2) return "•".repeat(trimmed.length);
  return `${trimmed.slice(0, visible)}…${trimmed.slice(-visible)}`;
}
