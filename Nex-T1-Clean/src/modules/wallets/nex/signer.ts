/**
 * Client-Side Signer Management
 * Handles encrypted storage of owner keys in browser storage
 *
 * SECURITY: Owner private keys NEVER leave the browser.
 * They are encrypted with AES-256-GCM using a PBKDF2-derived key (100k iterations).
 *
 * STORAGE: IndexedDB
 * Encrypted key blobs are stored in IndexedDB which provides:
 *   - Structured clone storage (not accessible via simple string reads)
 *   - Binary data support without base64 overhead
 *   - Better isolation than localStorage (requires DB open + transaction)
 *   - Automatic migration from legacy localStorage on first access
 *
 * MITIGATIONS:
 *   - Private keys are encrypted at rest (AES-256-GCM)
 *   - PBKDF2 with 100,000 iterations increases brute-force cost
 *   - CSP headers and strict input sanitization reduce XSS surface
 *   - Session-bound access reduces the window of exposure
 */

import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import {
  arrayBufferToBase64,
  base64ToUint8Array,
  uint8ArrayToString,
} from "./crypto-utils";

import { logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const IDB_NAME = "nex_wallet_store";
const IDB_VERSION = 1;
const IDB_STORE = "signers";

/** Legacy localStorage keys (for migration) */
const LEGACY_STORAGE_KEY = "nex_signer_";
const LEGACY_INDEX_KEY = "nex_signer_index";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EncryptedSigner {
  /** Encrypted private key (base64) */
  encryptedKey: string;
  /** Public address */
  address: Address;
  /** Creation timestamp */
  createdAt: number;
  /** Salt used for encryption */
  salt: string;
  /** IV used for encryption */
  iv: string;
}

/* ------------------------------------------------------------------ */
/*  IndexedDB Storage Layer                                            */
/* ------------------------------------------------------------------ */

/** Cache the DB instance to avoid re-opening on every call */
let dbInstance: IDBDatabase | null = null;
let migrationDone = false;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE); // key = userId
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // If the DB connection is closed externally, clear the cache
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

/** Migrate any legacy localStorage entries into IndexedDB (one-time) */
async function migrateLegacyStorage(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;

  if (typeof window === "undefined" || typeof localStorage === "undefined") return;

  const indexJson = localStorage.getItem(LEGACY_INDEX_KEY);
  if (!indexJson) return; // nothing to migrate

  let index: string[];
  try {
    index = JSON.parse(indexJson) as string[];
  } catch {
    return;
  }

  if (index.length === 0) return;

  const db = await openDB();

  for (const userId of index) {
    const raw = localStorage.getItem(`${LEGACY_STORAGE_KEY}${userId}`);
    if (!raw) continue;

    try {
      const signer = JSON.parse(raw) as EncryptedSigner;
      // Write to IndexedDB
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(signer, userId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      // Remove from localStorage after successful migration
      localStorage.removeItem(`${LEGACY_STORAGE_KEY}${userId}`);
    } catch (err) {
      logger.warn("[Signer] Failed to migrate entry for user, will retry next load", { userId, error: err });
      migrationDone = false; // retry next time
    }
  }

  // Clean up the legacy index
  localStorage.removeItem(LEGACY_INDEX_KEY);
}

async function idbSave(userId: string, signer: EncryptedSigner): Promise<boolean> {
  try {
    await migrateLegacyStorage();
    const db = await openDB();
    return new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(signer, userId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    logger.error("[Signer] IndexedDB save failed", { error: err });
    return false;
  }
}

async function idbLoad(userId: string): Promise<EncryptedSigner | null> {
  try {
    await migrateLegacyStorage();
    const db = await openDB();
    return new Promise<EncryptedSigner | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(userId);
      req.onsuccess = () => resolve((req.result as EncryptedSigner) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbDelete(userId: string): Promise<boolean> {
  try {
    await migrateLegacyStorage();
    const db = await openDB();
    return new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(userId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Encryption helpers                                                 */
/* ------------------------------------------------------------------ */

async function deriveEncryptionKey(
  password: string,
  salt: BufferSource
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPrivateKey(
  privateKey: Hex,
  password: string
): Promise<EncryptedSigner> {
  const account = privateKeyToAccount(privateKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return {
    encryptedKey: arrayBufferToBase64(encrypted),
    address: account.address,
    createdAt: Date.now(),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
  };
}

async function decryptPrivateKey(
  encrypted: EncryptedSigner,
  password: string
): Promise<Hex> {
  const saltArr = base64ToUint8Array(encrypted.salt);
  const ivArr = base64ToUint8Array(encrypted.iv);
  const dataArr = base64ToUint8Array(encrypted.encryptedKey);
  const salt = new Uint8Array(saltArr).buffer;
  const iv = new Uint8Array(ivArr).buffer;
  const data = new Uint8Array(dataArr).buffer;

  const key = await deriveEncryptionKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return uint8ArrayToString(new Uint8Array(decrypted)) as Hex;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a new signer for a user.
 * Generates a new private key, encrypts it, and stores it in IndexedDB.
 */
export async function createNexSigner({
  userId,
  password,
}: {
  userId: string;
  password: string;
}): Promise<{
  account: PrivateKeyAccount;
  address: Address;
  isNew: boolean;
}> {
  const existing = await idbLoad(userId);
  if (existing) {
    const privateKey = await decryptPrivateKey(existing, password);
    const account = privateKeyToAccount(privateKey);
    return { account, address: account.address, isNew: false };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const encrypted = await encryptPrivateKey(privateKey, password);
  const saved = await idbSave(userId, encrypted);

  if (!saved) {
    throw new Error("Failed to save signer to storage");
  }

  return { account, address: account.address, isNew: true };
}

/**
 * Get existing signer for a user (requires password to decrypt).
 */
export async function getNexSigner({
  userId,
  password,
}: {
  userId: string;
  password: string;
}): Promise<PrivateKeyAccount | null> {
  const encrypted = await idbLoad(userId);
  if (!encrypted) return null;

  try {
    const privateKey = await decryptPrivateKey(encrypted, password);
    return privateKeyToAccount(privateKey);
  } catch (error) {
    logger.error("[Signer] Failed to decrypt:", error);
    return null;
  }
}

/**
 * Check if a signer exists for a user (async — queries IndexedDB).
 */
export async function hasNexSigner(userId: string): Promise<boolean> {
  const encrypted = await idbLoad(userId);
  return encrypted !== null;
}

/**
 * Get the address of a stored signer without decrypting (async — queries IndexedDB).
 */
export async function getNexSignerAddress(userId: string): Promise<Address | null> {
  const encrypted = await idbLoad(userId);
  return encrypted?.address ?? null;
}

/**
 * Delete a signer (WARNING: This is irreversible!)
 */
export async function deleteNexSigner(userId: string): Promise<boolean> {
  return idbDelete(userId);
}

/**
 * Export a signer's private key.
 * WARNING: This exposes the private key - use with caution!
 */
export async function exportNexSignerKey({
  userId,
  password,
}: {
  userId: string;
  password: string;
}): Promise<Hex | null> {
  const encrypted = await idbLoad(userId);
  if (!encrypted) return null;

  try {
    return await decryptPrivateKey(encrypted, password);
  } catch {
    return null;
  }
}

/**
 * Import a signer from an existing private key.
 */
export async function importNexSigner({
  userId,
  privateKey,
  password,
}: {
  userId: string;
  privateKey: Hex;
  password: string;
}): Promise<{
  account: PrivateKeyAccount;
  address: Address;
}> {
  const account = privateKeyToAccount(privateKey);
  const encrypted = await encryptPrivateKey(privateKey, password);
  const saved = await idbSave(userId, encrypted);

  if (!saved) {
    throw new Error("Failed to save imported signer");
  }

  return { account, address: account.address };
}

/**
 * Change the password for an encrypted signer.
 */
export async function changeSignerPassword({
  userId,
  oldPassword,
  newPassword,
}: {
  userId: string;
  oldPassword: string;
  newPassword: string;
}): Promise<boolean> {
  const encrypted = await idbLoad(userId);
  if (!encrypted) return false;

  try {
    const privateKey = await decryptPrivateKey(encrypted, oldPassword);
    const newEncrypted = await encryptPrivateKey(privateKey, newPassword);
    return await idbSave(userId, newEncrypted);
  } catch {
    return false;
  }
}
