import "server-only";

import { Connection, PublicKey } from "@solana/web3.js";

const SOL_LAMPORTS = 1_000_000_000;
const DEFAULT_TIMEOUT_MS = Number(process.env.SOLANA_RPC_READ_TIMEOUT_MS ?? 4_000);

export type SolanaRecentSignature = {
  signature: string;
  timestamp: number | null;
};

export function resolveSolanaReadRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC?.trim() ||
    "https://api.mainnet-beta.solana.com"
  );
}

function getSolanaReadConnection(): Connection {
  return new Connection(resolveSolanaReadRpcUrl(), "confirmed");
}

async function withRpcTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function fetchSolanaNativeBalanceFromRpc(
  address: string,
): Promise<number | null> {
  const owner = address.trim();
  if (!owner) {
    return null;
  }

  try {
    const lamports = await withRpcTimeout(
      getSolanaReadConnection().getBalance(new PublicKey(owner), "confirmed"),
      null,
    );
    return typeof lamports === "number" && Number.isFinite(lamports)
      ? lamports / SOL_LAMPORTS
      : null;
  } catch {
    return null;
  }
}

export async function fetchSolanaRecentSignaturesFromRpc(
  address: string,
  limit: number,
): Promise<SolanaRecentSignature[]> {
  const owner = address.trim();
  if (!owner) {
    return [];
  }

  try {
    const signatures = await withRpcTimeout(
      getSolanaReadConnection().getSignaturesForAddress(
        new PublicKey(owner),
        { limit: Math.max(1, Math.min(100, limit)) },
        "confirmed",
      ),
      [],
    );

    return signatures
      .map((entry) => ({
        signature: entry.signature,
        timestamp:
          typeof entry.blockTime === "number"
            ? entry.blockTime * 1000
            : null,
      }))
      .filter((entry) => entry.signature.length > 0);
  } catch {
    return [];
  }
}
