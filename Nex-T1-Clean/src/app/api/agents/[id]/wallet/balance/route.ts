
import { type NextRequest } from "next/server";
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
import { getCdpClient } from "@/server/services/cdp/client";
import { getCachedValue } from "@/server/services/redis/cache-helpers";
import { getAgentWallets } from "@/server/services/cdp/agent-provision";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WalletBalance = {
  address: string;
  platform: string;
  chainId: number | null;
  native: {
    symbol: string;
    balance: string;
    usdValue: number | null;
  };
  tokens: Array<{
    contractAddress: string;
    symbol: string | null;
    name: string | null;
    amount: string;
    decimals: number;
    usdValue: number | null;
  }>;
  totalUsd: number | null;
};

type AgentBalanceResponse = {
  wallets: WalletBalance[];
  totalUsd: number | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CDP_NETWORK_MAP: Record<string, string> = {
  "8453": "base",
  "1": "ethereum",
};

async function fetchEvmWalletBalance(
  address: string,
  chainId: number | null,
): Promise<WalletBalance> {
  const cdp = await getCdpClient();

  const defaultBalance: WalletBalance = {
    address,
    platform: "evm",
    chainId,
    native: { symbol: "ETH", balance: "0", usdValue: null },
    tokens: [],
    totalUsd: null,
  };

  if (!cdp) {
    return defaultBalance;
  }

  try {
    const network =
      CDP_NETWORK_MAP[String(chainId ?? 8453)] ?? "base";

    const result = await cdp.evm.listTokenBalances({
      address: address as `0x${string}`,
      network: network as "base" | "base-sepolia" | "ethereum",
    });

    const balances = result.balances ?? [];

    let native = defaultBalance.native;
    const tokens: WalletBalance["tokens"] = [];

    for (const tb of balances) {
      const contractAddress =
        (tb as { token?: { contractAddress?: string } }).token
          ?.contractAddress ?? "native";
      const symbol =
        (tb as { token?: { symbol?: string } }).token?.symbol ?? null;
      const name =
        (tb as { token?: { name?: string } }).token?.name ?? null;
      const amount = String(
        (tb as { amount?: { amount?: bigint } }).amount?.amount ?? "0",
      );
      const decimals = Number(
        (tb as { amount?: { decimals?: number } }).amount?.decimals ?? 18,
      );

      if (contractAddress === "native" || contractAddress === "") {
        native = {
          symbol: symbol ?? "ETH",
          balance: amount,
          usdValue: null,
        };
      } else {
        tokens.push({
          contractAddress,
          symbol,
          name,
          amount,
          decimals,
          usdValue: null,
        });
      }
    }

    return {
      address,
      platform: "evm",
      chainId,
      native,
      tokens,
      totalUsd: null,
    };
  } catch (err) {
    logger.warn("agent_wallet_evm_balance_failed", {
      address,
      chainId,
      error: err instanceof Error ? err.message : String(err),
    });
    return defaultBalance;
  }
}

async function fetchSolanaWalletBalance(
  address: string,
): Promise<WalletBalance> {
  const defaultBalance: WalletBalance = {
    address,
    platform: "solana",
    chainId: null,
    native: { symbol: "SOL", balance: "0", usdValue: null },
    tokens: [],
    totalUsd: null,
  };

  try {
    const { Connection, PublicKey, clusterApiUrl } = await import(
      "@solana/web3.js"
    );

    const rpcUrl =
      process.env.SOLANA_RPC_URL ??
      process.env.HELIUS_RPC_URL ??
      clusterApiUrl("mainnet-beta");

    const connection = new Connection(rpcUrl, "confirmed");
    const pubkey = new PublicKey(address);

    const lamports = await connection.getBalance(pubkey);
    const solBalance = (lamports / 1e9).toString();

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        ),
      },
    );

    const tokens: WalletBalance["tokens"] = tokenAccounts.value.map(
      (account) => {
        const info = account.account.data.parsed?.info as
          | {
              mint?: string;
              tokenAmount?: {
                uiAmountString?: string;
                decimals?: number;
              };
            }
          | undefined;
        return {
          contractAddress: info?.mint ?? "unknown",
          symbol: null,
          name: null,
          amount: info?.tokenAmount?.uiAmountString ?? "0",
          decimals: info?.tokenAmount?.decimals ?? 9,
          usdValue: null,
        };
      },
    );

    return {
      address,
      platform: "solana",
      chainId: null,
      native: {
        symbol: "SOL",
        balance: solBalance,
        usdValue: null,
      },
      tokens,
      totalUsd: null,
    };
  } catch (err) {
    logger.warn("agent_wallet_solana_balance_failed", {
      address,
      error: err instanceof Error ? err.message : String(err),
    });
    return defaultBalance;
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/agents/[id]/wallet/balance
 *
 * Fetch real-time balances for all active wallets of an agent.
 * Fetches balances in parallel using Promise.allSettled.
 *
 * Auth required: agent owner only (or public/unlisted agents).
 * Redis cached: 30s TTL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_balance.GET", async () => {
    try {
      const { id } = await params;

      const paramsParsed = ParamsSchema.safeParse({ id });
      if (!paramsParsed.success) {
        return apiResponse.validationError(paramsParsed.error);
      }

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-wallet-balance",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Agent ownership / visibility check
      const supabase = getSupabaseAdminClient();
      const { data: agent, error: agentError } = await supabase
        .from("agent")
        .select("id,owner_user_id,org_id,visibility")
        .eq("id", id)
        .single();

      if (agentError || !agent) {
        return apiResponse.notFound("Agent not found");
      }

      const visibility = (agent.visibility as string) ?? "private";
      const isOwner = agent.owner_user_id === context.userId;

      if (!isOwner && visibility === "private") {
        return apiResponse.forbidden(
          "Only the agent owner can view wallet balances",
        );
      }

      // Fetch all active wallets with Redis caching
      const balanceData = await getCachedValue<AgentBalanceResponse>(
        "agent-wallet-balance",
        [id],
        30,
        async () => {
          const wallets = await getAgentWallets(id, "active");

          if (wallets.length === 0) {
            return { wallets: [], totalUsd: null };
          }

          // Fetch balances in parallel
          const results = await Promise.allSettled(
            wallets.map(async (w) => {
              if (w.platform === "solana") {
                return fetchSolanaWalletBalance(w.address);
              }
              return fetchEvmWalletBalance(
                w.address,
                w.chain_id,
              );
            }),
          );

          const walletBalances: WalletBalance[] = results
            .filter(
              (r): r is PromiseFulfilledResult<WalletBalance> =>
                r.status === "fulfilled",
            )
            .map((r) => r.value);

          return {
            wallets: walletBalances,
            totalUsd: null,
          };
        },
      );

      return apiResponse.success(balanceData);
    } catch (error) {
      logger.error("agent_wallet_balance_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to fetch agent wallet balances");
    }
  });
}
