
import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getCachedValue } from "@/server/services/redis/cache-helpers";
import { getEvmWalletHistory } from "@/server/moralis/evm/wallet";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => Math.min(Math.max(Number(val) || 50, 1), 200)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => Math.max(Number(val) || 0, 0)),
  chainId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransactionRecord = {
  txHash: string;
  direction: string;
  category: string;
  from: string;
  to: string;
  valueUsd: string | null;
  tokensIn: unknown | null;
  tokensOut: unknown | null;
  chain: string | null;
  summary: string | null;
  timestamp: string | null;
};

type TransactionsResponse = {
  transactions: TransactionRecord[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAddressOwnership(
  userId: string,
  address: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { count } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .ilike("address", address);

  return (count ?? 0) > 0;
}

/**
 * Fetch transactions from agent_wallet_transactions if the address
 * belongs to an agent wallet.
 */
async function fetchAgentWalletTransactions(
  address: string,
  limit: number,
  offset: number,
): Promise<TransactionsResponse | null> {
  const supabase = getSupabaseAdminClient();

  // Check if address belongs to an agent wallet
  const { data: agentWallet } = await supabase
    .from("agent_wallets")
    .select("id,agent_id")
    .ilike("address", address)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!agentWallet) {
    return null;
  }

  // Query agent_wallet_transactions using columns from the migration schema
  const { data, error, count } = await supabase
    .from("agent_wallet_transactions")
    .select("*", { count: "exact" })
    .eq("agent_wallet_id", agentWallet.id)
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.warn("cdp_wallet_agent_txns_query_failed", {
      address,
      agentWalletId: agentWallet.id,
      error: error.message,
    });
    return null;
  }

  const total = count ?? 0;
  const rows = data ?? [];

  const transactions: TransactionRecord[] = rows.map(
    (row: Record<string, unknown>) => ({
      txHash: String(row.tx_hash ?? ""),
      direction: String(row.direction ?? "unknown"),
      category: String(row.category ?? "unknown"),
      from: String(row.from_address ?? address),
      to: String(row.to_address ?? ""),
      valueUsd: row.value_usd != null ? String(row.value_usd) : null,
      tokensIn: row.tokens_in ?? null,
      tokensOut: row.tokens_out ?? null,
      chain: row.chain ? String(row.chain) : null,
      summary: row.summary ? String(row.summary) : null,
      timestamp: row.timestamp ? String(row.timestamp) : null,
    }),
  );

  return {
    transactions,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * CDP chain ID to Moralis hex chain mapping.
 * Used to translate numeric chain IDs from query params into Moralis format.
 */
const CDP_CHAIN_TO_MORALIS: Record<string, number> = {
  "8453": 8453,
  "84532": 84532,
  "1": 1,
  "11155111": 11155111,
  "42161": 42161,
  "10": 10,
  "137": 137,
  "43114": 43114,
};

/**
 * Fetch transaction history from the Moralis EVM Wallet History API.
 *
 * CDP SDK does not expose a listAddressTransactions method; transaction
 * history is sourced from the `agent_wallet_transactions` table first,
 * and this Moralis-based fallback is used for user Nex Wallets that have
 * on-chain history but no rows in the internal DB.
 *
 * For addresses that are not valid EVM addresses (e.g. Solana), this
 * returns an empty result since Moralis EVM history only supports EVM chains.
 *
 * @param address - The wallet address
 * @param chainId - The chain ID string (e.g. "8453")
 * @param limit   - Max results to return
 * @param offset  - Pagination offset (mapped to Moralis cursor-based pagination)
 * @returns Transaction history from Moralis, or empty if unavailable
 */
async function fetchFallbackTransactions(
  address: string,
  chainId: string,
  limit: number,
  offset: number,
): Promise<TransactionsResponse> {
  // Only attempt Moralis fallback for EVM addresses
  const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  if (!isEvmAddress) {
    return {
      transactions: [],
      meta: { total: 0, limit, offset, hasMore: false },
    };
  }

  const moralisChain = CDP_CHAIN_TO_MORALIS[chainId];
  if (!moralisChain) {
    logger.debug("cdp_wallet_txns_unsupported_chain_for_moralis", {
      address,
      chainId,
    });
    return {
      transactions: [],
      meta: { total: 0, limit, offset, hasMore: false },
    };
  }

  try {
    const moralisResult = await getEvmWalletHistory({
      address,
      chain: moralisChain,
      limit: Math.min(limit, 100), // Moralis caps at 100 per page
    });

    const normalizedOwner = address.toLowerCase();

    const transactions: TransactionRecord[] = moralisResult.items.map(
      (item) => {
        const hash =
          String(item.hash ?? item.transaction_hash ?? "");
        const from = String(item.from_address ?? "");
        const to = String(item.to_address ?? "");
        const fromLower = from.toLowerCase();
        const toLower = to.toLowerCase();

        const direction =
          fromLower === normalizedOwner && toLower === normalizedOwner
            ? "self"
            : fromLower === normalizedOwner
              ? "out"
              : toLower === normalizedOwner
                ? "in"
                : "unknown";

        const decoded =
          item.decoded && typeof item.decoded === "object"
            ? item.decoded
            : null;
        const decodedLabel = decoded
          ? String(
              (decoded as Record<string, unknown>).label ??
                (decoded as Record<string, unknown>).name ??
                "",
            )
          : null;

        const category =
          decodedLabel &&
          /swap|exactinput|exactoutput|trade/i.test(decodedLabel)
            ? "swap"
            : decodedLabel
              ? "contract"
              : "transfer";

        return {
          txHash: hash,
          direction,
          category,
          from,
          to,
          valueUsd: null,
          tokensIn: null,
          tokensOut: null,
          chain: `evm:${chainId}`,
          summary: decodedLabel || null,
          timestamp: item.block_timestamp
            ? String(item.block_timestamp)
            : null,
        };
      },
    );

    // Moralis uses cursor-based pagination, so total is approximate
    const hasMore = moralisResult.cursor !== null;
    const total = hasMore
      ? offset + transactions.length + 1
      : offset + transactions.length;

    logger.info("cdp_wallet_txns_moralis_fallback_success", {
      address,
      chainId,
      count: transactions.length,
      hasMore,
    });

    return {
      transactions,
      meta: {
        total,
        limit,
        offset,
        hasMore,
      },
    };
  } catch (err) {
    logger.warn("cdp_wallet_txns_moralis_fallback_failed", {
      address,
      chainId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Graceful degradation: return empty rather than failing the request
    return {
      transactions: [],
      meta: { total: 0, limit, offset, hasMore: false },
    };
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/wallets/[address]/transactions
 *
 * Fetch transaction history for a Nex Wallet.
 *
 * Resolution order:
 * 1. `agent_wallet_transactions` table (for agent-managed wallets with DB records)
 * 2. Moralis EVM Wallet History API (for user Nex Wallets on supported EVM chains)
 * 3. Empty result (for Solana wallets or unsupported chains)
 *
 * Query params:
 *   - limit: number of transactions to return (default 50, max 200)
 *   - offset: pagination offset (default 0)
 *   - chainId: optional chain filter (default "8453" for Base)
 *
 * Auth required: wallet owner only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  await connection();
  return timeApiRoute("cdp.wallets.transactions.GET", async () => {
    try {
      const { address } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-transactions",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Validate query params
      const { searchParams } = new URL(request.url);
      const queryParsed = QuerySchema.safeParse({
        limit: searchParams.get("limit") ?? "50",
        offset: searchParams.get("offset") ?? "0",
        chainId: searchParams.get("chainId") ?? undefined,
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const { limit, offset, chainId } = queryParsed.data;
      const resolvedChainId = chainId ?? "8453";

      // Verify wallet ownership
      const ownsWallet = await verifyAddressOwnership(
        context.userId,
        address,
      );
      if (!ownsWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }

      // Try agent wallet transactions first, then fall back to CDP
      const result = await getCachedValue<TransactionsResponse>(
        "cdp-wallet-txns",
        [address, resolvedChainId, limit, offset],
        30,
        async () => {
          const agentResult = await fetchAgentWalletTransactions(
            address,
            limit,
            offset,
          );
          if (agentResult && agentResult.transactions.length > 0) {
            return agentResult;
          }

          return fetchFallbackTransactions(
            address,
            resolvedChainId,
            limit,
            offset,
          );
        },
      );

      return apiResponse.success(result.transactions, result.meta);
    } catch (error) {
      logger.error("cdp_wallet_transactions_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError(
        "Failed to fetch transaction history",
      );
    }
  });
}
