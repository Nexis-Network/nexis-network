/**
 * Passkey (WebAuthn) Signer Management
 * Handles hardware-backed security (TouchID/FaceID) for smart accounts
 * 
 * Uses standard WebAuthn API + Viem to create p256 signatures
 * compatible with Barz/Trust Wallet smart accounts.
 * 
 * @see https://viem.sh/docs/accounts/webauthn
 */

import { toWebAuthnAccount, createWebAuthnCredential, type WebAuthnAccount } from "viem/account-abstraction";



import { logger } from '@/lib/logger';
const RP_NAME = "Nexis Network";

/**
 * Get normalized RP ID for WebAuthn.
 * IPv6 addresses like "[::]" are invalid RP IDs - normalize localhost variants.
 */
function getRpId(): string {
  if (typeof window === "undefined") return "localhost";
  const hostname = window.location.hostname;
  // IPv6 localhost variants
  if (hostname === "[::]" || hostname === "[::1]" || hostname === "::1") {
    return "localhost";
  }
  // IPv4 localhost
  if (hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return "localhost";
  }
  return hostname;
}

const RP_ID = getRpId();


export class PasskeyError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "PasskeyError";
  }
}

// Storage key for the last used credential ID to enable "silent" login suggestion
const PASSKEY_CREDENTIAL_KEY = "nex_passkey_credential";

type StoredCredential = {
  id: string;
  publicKey: `0x${string}`;
  address?: `0x${string}`; // Optional for backward compatibility, but we should populate it
};

/**
 * Register a new Passkey
 * Triggers browser biometric prompt
 */
export async function registerPasskey(userId: string): Promise<{ account: WebAuthnAccount; credential: { id: string; publicKey: `0x${string}` } }> {
  if (!isWebAuthnSupported()) {
    throw new PasskeyError("Passkeys are not supported in this browser");
  }

    // Dev-only mock passkey (signing will fail -- for record creation testing only)
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_MOCK_PASSKEY === "true") {
      const mockId = "mock-credential-id-" + Date.now();
      const mockPublicKey = "0x04..." as `0x${string}`;

      logger.debug("Mocking Passkey Registration");

      return {
        account: {
           address: "0xMockPasskeyAddress" as `0x${string}`,
           publicKey: mockPublicKey,
           type: "webAuthn",
           signMessage: async () => "0xmocksignature",
           signTypedData: async () => "0xmocksignature",
           source: "custom"
        } as UntypedJson as WebAuthnAccount,
        credential: { id: mockId, publicKey: mockPublicKey }
      };
    }

    try {
      const credential = await createWebAuthnCredential({
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        // Use Uint8Array for user ID - compatible with ArrayBufferLike
        id: new Uint8Array(new TextEncoder().encode(userId)),
        name: userId,
        displayName: `User ${userId.slice(0, 6)}`,
      },
    });

    const account = toWebAuthnAccount({
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
      },
    });

    const accountAddress = (account as { address?: `0x${string}` }).address;
    saveCredentialData({ id: credential.id, publicKey: credential.publicKey, address: accountAddress });
    // Return both the account AND the raw credential details needed for server registration
    return { account, credential };
  } catch (error: UntypedJson) {
    logger.error("Failed to register passkey:", error instanceof Error ? error.message : String(error));
    throw mapWebAuthnError(error);
  }
}

/**
 * Login with existing Passkey
 * Triggers browser biometric prompt for validation
 *
 * SECURITY: This function MUST trigger navigator.credentials.get() to require
 * user verification (biometric/PIN) before returning a usable WebAuthn account.
 * Without this verification, a seized device could sign transactions without
 * any user interaction, since toWebAuthnAccount() alone does not verify the user.
 *
 * The flow is:
 * 1. Retrieve stored credential ID from localStorage
 * 2. Call navigator.credentials.get() with userVerification: "required"
 *    This triggers the biometric prompt (TouchID/FaceID/PIN)
 * 3. Only after successful verification, create the WebAuthn account
 *
 * @param credentialId - Optional specific credential ID to use
 * @returns WebAuthn account ready for signing
 */
export async function loginPasskey(credentialId?: string): Promise<WebAuthnAccount> {
  if (!isWebAuthnSupported()) {
    throw new PasskeyError("Passkeys are not supported in this browser");
  }

  const stored = getStoredCredentialData();

  if (!stored || (credentialId && stored.id !== credentialId)) {
    throw new Error("No matching passkey found. Please register first.");
  }

  try {
    // SECURITY: Request biometric/PIN verification via navigator.credentials.get()
    // with userVerification: "required" to ensure the physical user is present.
    // This prevents a seized/stolen device from silently signing transactions.
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: RP_ID,
        allowCredentials: [
          {
            type: "public-key" as const,
            id: base64UrlToBuffer(stored.id),
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new PasskeyError("Biometric verification failed or was cancelled.", "cancelled");
    }

    // Verification succeeded -- the user has proven physical presence via biometric/PIN.
    // Now create the WebAuthn account for signing operations.
    const account = toWebAuthnAccount({
      credential: {
        id: stored.id,
        publicKey: stored.publicKey,
      },
    });

    // Refresh storage (optional, but good for consistency)
    saveCredentialData(stored);
    return account;
  } catch (error: UntypedJson) {
    logger.error("Failed to login with passkey:", error instanceof Error ? error.message : String(error));
    throw mapWebAuthnError(error);
  }
}

/**
 * Convert a base64url-encoded credential ID to an ArrayBuffer for use with
 * navigator.credentials.get() allowCredentials.
 */
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 =
    base64url.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((base64url.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if user has a passkey stored locally
 * NOTE: This only checks if we have a Credential ID saved. 
 * We can't know if the physical key exists until we try to use it.
 */
export function hasPasskeyOnDevice(): boolean {
  return !!getStoredCredentialData();
}

/**
 * Helper: Save Credential Data for future logins
 */
function saveCredentialData(data: StoredCredential) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PASSKEY_CREDENTIAL_KEY, JSON.stringify(data));
}

/**
 * Helper: Get stored Credential Data
 */
export function getStoredCredentialData(): StoredCredential | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PASSKEY_CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCredential;
  } catch {
    return null;
  }
}

/**
 * Helper: Clear stored Credential ID
 */
export function clearPasskeyData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PASSKEY_CREDENTIAL_KEY);
}


/**
 * Helper: Check if browser supports WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    !!window.navigator.credentials
  );
}

/**
 * Helper: Map WebAuthn errors to user-friendly messages
 */
function mapWebAuthnError(error: UntypedJson): PasskeyError {
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || msg.includes("The operation either timed out or was not allowed")) {
    return new PasskeyError("Passkey access was cancelled or timed out.", "cancelled");
  }

  if (name === "InvalidStateError" || msg.includes("already registered")) {
    return new PasskeyError("This device is already registered with a passkey.", "duplicate");
  }

  if (name === "NotSupportedError") {
    return new PasskeyError("Your devise does not support the required passkey authentication.", "not_supported");
  }

  // Fallback
  return new PasskeyError(msg || "Unknown passkey error", "unknown");
}
