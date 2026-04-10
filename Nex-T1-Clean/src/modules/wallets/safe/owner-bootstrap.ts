// Domain: wallets (Safe)
// Responsibility: Client-side Safe owner key generation + proof-of-possession registration.
// Depends on: WebCrypto, viem/accounts, Nex crypto utils
// Notes:
// - No user prompt: uses a device-local secret to encrypt the owner key.
// - Server never receives raw private key; only encrypted blob + signature proof.

"use client";

import type { Address, Hex } from "viem";
import { hexToBytes } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { arrayBufferToBase64, base64ToUint8Array } from "@/modules/wallets/nex/crypto-utils";

type EncryptedOwnerBlob = {
  version: 1;
  address: Address;
  encryptedKey: string; // base64
  iv: string; // base64
  createdAt: number;
};

const OWNER_KEY_STORAGE = (userId: string) => `safe_owner_blob:${userId}`;
const DEVICE_SECRET_STORAGE = (userId: string) => `safe_owner_secret:${userId}`;
const OWNER_REGISTERED_FLAG = (userId: string) => `safe_owner_registered:${userId}`;

type AuthModeWindow = Window & {
  __TEST_MODE?: boolean;
};

export function isLocalOwnerEnabled(): boolean {
  const override = process.env.NEXT_PUBLIC_LOCAL_OWNER_ENABLED?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function isAuthBypassMode(): boolean {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) return false; // SECURITY: Never allow auth bypass in production builds
  const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";
  const testMode =
    (typeof window !== "undefined" && (window as AuthModeWindow).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true";
  return devAuthBypass || testMode;
}

async function resolveSupabaseAccessToken(): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token?.trim();
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

function getOrCreateDeviceSecret(userId: string): Uint8Array {
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(DEVICE_SECRET_STORAGE(userId)) : null;
  if (existing) {
    return base64ToUint8Array(existing);
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  window.localStorage.setItem(DEVICE_SECRET_STORAGE(userId), arrayBufferToBase64(bytes));
  return bytes;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  // Ensure a plain ArrayBuffer (TS-friendly, avoids SharedArrayBuffer typing issues)
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function importAesKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toArrayBuffer(secret), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptPrivateKey(privateKey: Hex, key: CryptoKey): Promise<{ encryptedKey: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(privateKey);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { encryptedKey: arrayBufferToBase64(encrypted), iv: arrayBufferToBase64(iv) };
}

async function decryptPrivateKey(blob: EncryptedOwnerBlob, key: CryptoKey): Promise<Hex> {
  const iv = new Uint8Array(toArrayBuffer(base64ToUint8Array(blob.iv)));
  const encrypted = base64ToUint8Array(blob.encryptedKey);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, toArrayBuffer(encrypted));
  const text = new TextDecoder().decode(new Uint8Array(decrypted));
  return text as Hex;
}

function loadOwnerBlob(userId: string): EncryptedOwnerBlob | null {
  const raw = window.localStorage.getItem(OWNER_KEY_STORAGE(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EncryptedOwnerBlob;
    if (!parsed || parsed.version !== 1 || typeof parsed.address !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getOrCreateOwner(userId: string): Promise<{ account: ReturnType<typeof privateKeyToAccount>; blob: EncryptedOwnerBlob }> {
  const existing = loadOwnerBlob(userId);
  const secret = getOrCreateDeviceSecret(userId);
  const key = await importAesKey(secret);

  if (existing) {
    const privateKey = await decryptPrivateKey(existing, key);
    const account = privateKeyToAccount(privateKey);
    return { account, blob: existing };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const encrypted = await encryptPrivateKey(privateKey, key);

  const blob: EncryptedOwnerBlob = {
    version: 1,
    address: account.address,
    encryptedKey: encrypted.encryptedKey,
    iv: encrypted.iv,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(OWNER_KEY_STORAGE(userId), JSON.stringify(blob));
  return { account, blob };
}

export async function ensureSafeOwnerRegistered(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!userId) return;
  if (!isLocalOwnerEnabled()) return;
  if (isAuthBypassMode()) return;

  const already = window.localStorage.getItem(OWNER_REGISTERED_FLAG(userId));
  if (already === "true") return;

  const { account, blob } = await getOrCreateOwner(userId);
  const accessToken = await resolveSupabaseAccessToken();
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const challengeRes = await fetch("/api/wallets/owner/challenge", {
    method: "POST",
    credentials: "include",
    headers: authHeaders,
  });
  if (challengeRes.status === 401) {
    // Session cookies can lag immediately after auth transitions. Retry on next bootstrap cycle.
    return;
  }
  if (!challengeRes.ok) {
    throw new Error(`owner_challenge_failed:${challengeRes.status}`);
  }
  const challenge = (await challengeRes.json()) as { message?: string; challengeToken?: string };
  const message = String(challenge.message ?? "");
  if (!message) throw new Error("missing_challenge_message");

  const signature = await account.signMessage({ message });

  const verifyRes = await fetch("/api/wallets/owner/verify", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authHeaders ?? {}),
    },
    body: JSON.stringify({
      ownerAddress: blob.address,
      signature,
      challengeToken: challenge.challengeToken,
    }),
  });
  if (verifyRes.status === 401) {
    return;
  }
  if (!verifyRes.ok) {
    throw new Error(`owner_verify_failed:${verifyRes.status}`);
  }

  window.localStorage.setItem(OWNER_REGISTERED_FLAG(userId), "true");
}

export async function signSafeTxHashWithOwner(params: { userId: string; safeTxHash: Hex }): Promise<Hex> {
  if (typeof window === "undefined") {
    throw new Error("owner_sign_unavailable_server");
  }
  if (!params.userId) {
    throw new Error("missing_user_id");
  }
  if (!isLocalOwnerEnabled()) {
    throw new Error("local_owner_disabled");
  }
  const { account } = await getOrCreateOwner(params.userId);
  // IMPORTANT: Safe tx approval uses an eth_sign style signature of the raw tx hash bytes.
  const signature = await account.signMessage({ message: { raw: hexToBytes(params.safeTxHash) } });
  return signature as Hex;
}
