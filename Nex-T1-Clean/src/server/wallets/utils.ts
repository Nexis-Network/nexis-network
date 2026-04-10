import { randomBytes } from "crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { verifyMessage } from "viem";

export type SupportedChain = "evm" | "solana";

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

export function getWalletChallengeTtl(): number {
  const raw = process.env.WALLET_CHALLENGE_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}

export function normalizeWalletAddress(chain: SupportedChain, address: string): string {
  return chain === "evm" ? address.toLowerCase() : address;
}

function resolveDomain(): string {
  const explicit = process.env.AUTH_DOMAIN?.trim();
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "https://nex-t1.ai";
  try {
    return new URL(appUrl).host;
  } catch {
    return "nex-t1.ai";
  }
}

function resolveUri(): string {
  const explicit = process.env.AUTH_URI?.trim();
  if (explicit) return explicit;
  return process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "https://nex-t1.ai";
}

export function buildWalletChallengeMessage(params: {
  chain: SupportedChain;
  address: string;
  nonce: string;
  issuedAt: string;
}): string {
  const { chain, address, nonce, issuedAt } = params;
  const domain = resolveDomain();
  const uri = resolveUri();

  if (chain === "evm") {
    return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with your wallet to continue.\n\nURI: ${uri}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
  }

  return `Sign in to Nex-T1\nAddress: ${address}\nURI: ${uri}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

export function createWalletNonce(): string {
  return randomBytes(16).toString("hex");
}

export function calculateWalletChallengeExpiry(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

export function isWalletChallengeExpired(expiresAtIso: string): boolean {
  const expiresAt = new Date(expiresAtIso).getTime();
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

export async function verifyWalletSignature(params: {
  chain: SupportedChain;
  message: string;
  signature: string;
  address: string;
  encoding?: string;
}): Promise<boolean> {
  const { chain, message, signature, address, encoding } = params;
  try {
    if (chain === "evm") {
      const normalizedSignature = signature.startsWith("0x") ? signature : `0x${signature}`;
      return await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: normalizedSignature as `0x${string}`,
      });
    }

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signatureBytes =
      encoding === "base58" ? bs58.decode(signature) : Buffer.from(signature, "hex");
    const publicKeyBytes = bs58.decode(address);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
