/**
 * Non-Custodial Solana Wallet Management
 * Client-side Solana keypair generation and storage
 * 
 * SECURITY: Solana private keys NEVER leave the browser
 * They are encrypted and stored in localStorage
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { arrayBufferToBase64, base64ToUint8Array } from "./crypto-utils";

/**
 * Storage key prefix for Solana wallets
 */
const SOLANA_WALLET_KEY = "nex_solana_";

/**
 * Encrypted Solana wallet stored in browser
 */
interface EncryptedSolanaWallet {
  /** Encrypted secret key (base64) */
  encryptedSecretKey: string;
  /** Public key (base58) */
  publicKey: string;
  /** Network: mainnet or devnet */
  network: "mainnet" | "devnet";
  /** Creation timestamp */
  createdAt: number;
  /** Salt used for encryption */
  salt: string;
  /** IV used for encryption */
  iv: string;
}

/**
 * Derive an encryption key from user credentials
 */
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

/**
 * Encrypt a Solana secret key
 */
async function encryptSecretKey(
  secretKey: Uint8Array,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    secretKey as UntypedJson as BufferSource
  );

  return {
    encryptedKey: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a Solana secret key
 */
async function decryptSecretKey(
  encryptedKey: string,
  salt: string,
  iv: string,
  password: string
): Promise<Uint8Array> {
  const saltBytes = new Uint8Array(base64ToUint8Array(salt)).buffer;
  const ivBytes = new Uint8Array(base64ToUint8Array(iv)).buffer;
  const data = new Uint8Array(base64ToUint8Array(encryptedKey)).buffer;

  const key = await deriveEncryptionKey(password, saltBytes);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    data
  );

  return new Uint8Array(decrypted);
}

/**
 * Get storage
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

/**
 * Save encrypted Solana wallet
 */
function saveEncryptedWallet(
  userId: string,
  network: "mainnet" | "devnet",
  wallet: EncryptedSolanaWallet
): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const key = `${SOLANA_WALLET_KEY}${userId}_${network}`;
  storage.setItem(key, JSON.stringify(wallet));
  return true;
}

/**
 * Load encrypted Solana wallet
 */
function loadEncryptedWallet(
  userId: string,
  network: "mainnet" | "devnet"
): EncryptedSolanaWallet | null {
  const storage = getStorage();
  if (!storage) return null;

  const key = `${SOLANA_WALLET_KEY}${userId}_${network}`;
  const data = storage.getItem(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as EncryptedSolanaWallet;
  } catch {
    return null;
  }
}

/**
 * Create or get a Solana wallet for a user
 */
export async function getOrCreateSolanaWallet({
  userId,
  network,
  password,
}: {
  userId: string;
  network: "mainnet" | "devnet";
  password: string;
}): Promise<{
  keypair: Keypair;
  publicKey: string;
  isNew: boolean;
}> {
  // Check if wallet exists
  const existing = loadEncryptedWallet(userId, network);
  if (existing) {
    // Decrypt and return
    const secretKey = await decryptSecretKey(
      existing.encryptedSecretKey,
      existing.salt,
      existing.iv,
      password
    );
    const keypair = Keypair.fromSecretKey(secretKey);
    return {
      keypair,
      publicKey: existing.publicKey,
      isNew: false,
    };
  }

  // Generate new keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Encrypt and store
  const encrypted = await encryptSecretKey(keypair.secretKey, password);
  const wallet: EncryptedSolanaWallet = {
    encryptedSecretKey: encrypted.encryptedKey,
    publicKey,
    network,
    createdAt: Date.now(),
    salt: encrypted.salt,
    iv: encrypted.iv,
  };

  const saved = saveEncryptedWallet(userId, network, wallet);
  if (!saved) {
    throw new Error("Failed to save Solana wallet");
  }

  return {
    keypair,
    publicKey,
    isNew: true,
  };
}

/**
 * Check if Solana wallet exists
 */
export function hasSolanaWallet(
  userId: string,
  network: "mainnet" | "devnet"
): boolean {
  return loadEncryptedWallet(userId, network) !== null;
}

/**
 * Get Solana wallet public key without decrypting
 */
export function getSolanaPublicKey(
  userId: string,
  network: "mainnet" | "devnet"
): string | null {
  const wallet = loadEncryptedWallet(userId, network);
  return wallet?.publicKey ?? null;
}

/**
 * Export Solana private key (for backup)
 */
export async function exportSolanaPrivateKey({
  userId,
  network,
  password,
}: {
  userId: string;
  network: "mainnet" | "devnet";
  password: string;
}): Promise<string | null> {
  const wallet = loadEncryptedWallet(userId, network);
  if (!wallet) return null;

  try {
    const secretKey = await decryptSecretKey(
      wallet.encryptedSecretKey,
      wallet.salt,
      wallet.iv,
      password
    );
    // Return as base58 encoded string (standard Solana format)
    return bs58.encode(secretKey);
  } catch {
    return null;
  }
}

/**
 * Import Solana wallet from private key
 */
export async function importSolanaWallet({
  userId,
  network,
  privateKeyBase58,
  password,
}: {
  userId: string;
  network: "mainnet" | "devnet";
  privateKeyBase58: string;
  password: string;
}): Promise<{
  publicKey: string;
}> {
  // Decode and validate
  const secretKey = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);
  const publicKey = keypair.publicKey.toBase58();

  // Encrypt and store
  const encrypted = await encryptSecretKey(keypair.secretKey, password);
  const wallet: EncryptedSolanaWallet = {
    encryptedSecretKey: encrypted.encryptedKey,
    publicKey,
    network,
    createdAt: Date.now(),
    salt: encrypted.salt,
    iv: encrypted.iv,
  };

  const saved = saveEncryptedWallet(userId, network, wallet);
  if (!saved) {
    throw new Error("Failed to save imported Solana wallet");
  }

  return { publicKey };
}

/**
 * Delete Solana wallet (WARNING: Irreversible!)
 */
export function deleteSolanaWallet(
  userId: string,
  network: "mainnet" | "devnet"
): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const key = `${SOLANA_WALLET_KEY}${userId}_${network}`;
  storage.removeItem(key);
  return true;
}
