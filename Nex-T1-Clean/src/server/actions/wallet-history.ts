"use server";

import { birdeyeFetch } from "@/lib/birdeye/client";
import { TransactionListResponse, TransactionHistoryItem } from "@/types/birdeye";
import {
  getEvmWalletHistory,
  mapEvmHistoryToUnified,
  toUnifiedEvmChain,
} from "@/server/moralis/evm/wallet";

import { logger } from "@/lib/logger";
export type WalletHistoryItem = {
  id: string;
  hash: string;
  type: "transfer" | "swap" | "contract" | "unknown";
  direction: "in" | "out" | "self" | "unknown";
  timestamp: string | null; // ISO string
  summary: string;
  value?: string;
  symbol?: string;
  success: boolean;
};

export async function getWalletHistoryAction(
  address: string,
  chainOrNetwork: string | number,
  walletType: "evm" | "solana",
): Promise<{ success: boolean; data: WalletHistoryItem[]; error?: string }> {
  try {
    if (walletType === "evm") {
      const chainId = Number(chainOrNetwork);
      // Use Moralis for EVM
      try {
        const history = await getEvmWalletHistory({ address, chain: chainId });
        const unified = mapEvmHistoryToUnified(
          history.items,
          address,
          toUnifiedEvmChain(chainId),
        );

        const items: WalletHistoryItem[] = unified.map((tx) => ({
          id: tx.id,
          hash: tx.hash,
          type:
            tx.category === "swap"
              ? "swap"
              : tx.category === "contract"
                ? "contract"
                : "transfer", // category: swap|contract|transfer matches well
          direction: tx.direction === "self" ? "unknown" : tx.direction,
          timestamp: tx.timestamp || null,
          summary:
            tx.summary ||
            (tx.category === "swap"
              ? "Swap"
              : tx.category === "contract"
                ? "Contract Interaction"
                : "Transfer"),
          success: tx.raw?.receipt_status === "0" ? false : true, // Check receipt status: "0" = reverted, "1" or absent = success
        }));

        return { success: true, data: items };
      } catch (e: UntypedJson) {
        // Check if it's a 404 (wallet has no history) vs actual error
        const meta = (e as Record<string, UntypedJson>)?.meta;
        const is404 = meta?.errorType === "not_found" || meta?.status === 404;

        if (is404) {
          // Expected - wallet has no transaction history, don't log as error
          return { success: true, data: [], error: undefined };
        } else {
          // Actual error - log it
          logger.error(
            "Moralis History Fetch Failed",
            e instanceof Error ? e.message : String(e),
          );
          return {
            success: false,
            data: [],
            error: "Failed to fetch EVM history",
          };
        }
      }
    }

    // Solana (Birdeye) logic below...
    const response = await birdeyeFetch<TransactionListResponse>(
      `v1/wallet/tx_list?wallet=${address}&limit=20`,
      {
        chain: "solana",
        version: "v1",
      },
    );

    if (!response || !response.items) {
      return { success: true, data: [] };
    }

    const items = response.items.map((tx: TransactionHistoryItem): WalletHistoryItem => {
      const hash = tx.txHash;
      const timestamp = tx.blockTime; // Birdeye returns ISO string usually? or standard string date.

      const fromLower = (tx.from || "").toLowerCase();
      // address passed might not be lowercased, ensure consistency
      const addressLower = address.toLowerCase();
      const direction =
        fromLower === addressLower
          ? "out"
          : tx.to?.toLowerCase() === addressLower
            ? "in"
            : "unknown";

      // Map mainAction to type
      let type: WalletHistoryItem["type"] = "unknown";
      const action = tx.mainAction?.toLowerCase();
      if (action?.includes("swap")) type = "swap";
      else if (
        action?.includes("transfer") ||
        action?.includes("sent") ||
        action?.includes("received")
      )
        type = "transfer";
      else if (action) type = "contract"; // assume contract/interaction for others

      return {
        id: hash,
        hash,
        type,
        direction,
        timestamp,
        summary: tx.mainAction || "Transaction",
        success: tx.status,
      };
    });

    return { success: true, data: items };
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch wallet history (Birdeye):", message);
    return {
      success: false,
      data: [],
      error: message || "Failed to fetch history",
    };
  }
}
