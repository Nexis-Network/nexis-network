/**
 * Session Key Grant Operations
 * Client-side functions for granting session keys to AI agents
 */

import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type {
  SessionKeyPermissions,
  GrantSessionKeyResult,
} from "./types";
import { serializePermissions } from "./validate";

/**
 * Default session key expiry: 24 hours
 */
export const DEFAULT_SESSION_KEY_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum session key expiry: 7 days
 */
export const MAX_SESSION_KEY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a new session keypair client-side
 * The private key will be encrypted before sending to server
 */
export function generateSessionKeypair(): {
  privateKey: Hex;
  publicKey: Hex;
  address: Address;
} {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  return {
    privateKey,
    publicKey: account.publicKey,
    address: account.address,
  };
}

/**
 * Encrypt a session key private key for server storage
 * Uses Web Crypto API for client-side encryption with AES-GCM
 * 
 * SECURITY: Encryption key is REQUIRED. Never store private keys unencrypted.
 * 
 * @param privateKey - The private key to encrypt
 * @param userEncryptionKey - Required encryption key (derived from user password/PIN)
 * @throws Error if no encryption key is provided
 */
export async function encryptSessionKeyForServer(
  privateKey: Hex,
  userEncryptionKey: string
): Promise<string> {
  // SECURITY: Encryption key is mandatory - never store private keys unencrypted
  if (!userEncryptionKey || userEncryptionKey.trim().length === 0) {
    throw new Error(
      "Encryption key is required for session key storage. " +
      "Private keys must never be stored unencrypted."
    );
  }

  // Use Web Crypto API for encryption
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);

  // Derive key from user encryption key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userEncryptionKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return Buffer.from(combined).toString("base64");
}

/**
 * Grant a session key to the AI agent
 * This is called from the client when the user wants to delegate permissions
 * 
 * SECURITY: userEncryptionKey is REQUIRED to ensure private keys are encrypted
 * 
 * @param walletAddress - The smart account address granting the session key
 * @param chainId - The chain ID for the session key
 * @param permissions - The permissions to grant
 * @param expiryMs - Session key expiry in milliseconds (default: 24 hours)
 * @param userEncryptionKey - Required encryption key for private key storage
 */
export async function grantAgentSessionKey({
  walletAddress,
  chainId,
  permissions,
  expiryMs = DEFAULT_SESSION_KEY_EXPIRY_MS,
  userEncryptionKey,
}: {
  walletAddress: Address;
  chainId: number;
  permissions: Omit<SessionKeyPermissions, "validUntil">;
  expiryMs?: number;
  /** Required: Encryption key for secure private key storage */
  userEncryptionKey: string;
}): Promise<GrantSessionKeyResult> {
  // SECURITY: Validate encryption key is provided
  if (!userEncryptionKey || userEncryptionKey.trim().length === 0) {
    return {
      success: false,
      error: "Encryption key is required for session key security. Please provide a password or PIN.",
    };
  }

  // Validate expiry
  if (expiryMs > MAX_SESSION_KEY_EXPIRY_MS) {
    return {
      success: false,
      error: `Session key expiry cannot exceed ${MAX_SESSION_KEY_EXPIRY_MS / (24 * 60 * 60 * 1000)} days`,
    };
  }

  // Generate session keypair
  const { privateKey, address } = generateSessionKeypair();

  // Calculate expiry timestamp
  const validUntil = Math.floor((Date.now() + expiryMs) / 1000);
  const expiresAt = new Date(validUntil * 1000);

  // Encrypt private key for server storage (encryption key is validated above)
  const encryptedPrivateKey = await encryptSessionKeyForServer(
    privateKey,
    userEncryptionKey
  );

  // Full permissions object
  const fullPermissions: SessionKeyPermissions = {
    ...permissions,
    validUntil,
  };

  // Send to server
  try {
    const response = await fetch("/api/wallets/session-keys/grant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        chainId,
        sessionPublicKey: address,
        encryptedSessionPrivateKey: encryptedPrivateKey,
        permissions: serializePermissions(fullPermissions),
        expiresAt: expiresAt.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to grant session key: ${error}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      sessionKeyId: result.sessionKeyId,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Create default permissions for common use cases
 */
export function createDefaultPermissions(
  preset: "conservative" | "moderate" | "permissive"
): Omit<SessionKeyPermissions, "validUntil"> {
  switch (preset) {
    case "conservative":
      return {
        spendingLimit: "10000000000000000", // 0.01 ETH
        contractWhitelist: [], // Must be specified
        allowedMethods: ["transfer"],
      };
    case "moderate":
      return {
        spendingLimit: "100000000000000000", // 0.1 ETH
        contractWhitelist: [], // Any contract
        allowedMethods: ["transfer", "swap", "approve"],
      };
    case "permissive":
      return {
        spendingLimit: "1000000000000000000", // 1 ETH
        contractWhitelist: [], // Any contract
        allowedMethods: undefined, // Any method
      };
    default:
      return createDefaultPermissions("conservative");
  }
}
