import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_ENV = "WALLET_VAULT_KEY";
const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // GCM recommended 96-bit IV

export type VaultCipher = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getVaultKey(): Buffer {
  const value = process.env[KEY_ENV];
  if (!value) {
    throw new Error(
      `${KEY_ENV} must be set to a base64-encoded 32-byte key for wallet storage.`,
    );
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `${KEY_ENV} must decode to ${KEY_LENGTH} bytes; received ${key.length}.`,
    );
  }
  return key;
}

export function encryptSecret(plainText: string): VaultCipher {
  const key = getVaultKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(cipher: VaultCipher): string {
  const key = getVaultKey();
  const iv = Buffer.from(cipher.iv, "base64");
  const payload = Buffer.from(cipher.ciphertext, "base64");
  const authTag = Buffer.from(cipher.authTag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
  return plain.toString("utf8");
}
