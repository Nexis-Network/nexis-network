import type { WalletHistoryEvent } from "@/server/settings/wallet-aggregator";

type SolanaHistoryTransaction = {
  signature: string | null;
  timestamp: number | null;
};

type BuildFallbackSolanaHistoryEventsInput = {
  walletAddress: string;
  walletLabel: string;
  knownTxHashes: Set<string>;
  transactions: SolanaHistoryTransaction[];
};

export function buildFallbackSolanaHistoryEvents(
  input: BuildFallbackSolanaHistoryEventsInput,
): WalletHistoryEvent[] {
  const seen = new Set(input.knownTxHashes);
  const events: WalletHistoryEvent[] = [];

  for (const transaction of input.transactions) {
    const signature = transaction.signature?.trim();
    if (!signature || seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    events.push({
      id: signature,
      timestamp: transaction.timestamp ?? null,
      walletLabel: input.walletLabel,
      walletAddress: input.walletAddress,
      type: "transfer",
      name: "On-chain activity",
      symbol: null,
      amount: null,
      priceUsd: null,
      chainId: null,
      tokenAddress: null,
      tokenId: null,
      thumb: null,
      source: "solana",
      txHash: signature,
    });
  }

  return events;
}
