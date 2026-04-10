import "server-only";

import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCdpClient } from "@/server/services/cdp/client";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { checkRateLimit, cdpBalanceRateLimit } from "@/server/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * CDP Token Balances API
 *
 * GET /api/cdp/balances?address=0x...&network=base
 *
 * Fetches EVM token balances from CDP's `listTokenBalances` API.
 * This complements Moralis-sourced portfolio data with CDP-native
 * balance tracking for Smart Account wallets.
 *
 * Supported networks: base, base-sepolia, ethereum
 * (CDP SDK's ListEvmTokenBalancesNetwork is more restrictive than
 *  the general EVM network list)
 */

const CDP_BALANCE_NETWORKS = ["base", "base-sepolia", "ethereum"] as const;
type CdpBalanceNetwork = (typeof CDP_BALANCE_NETWORKS)[number];

const querySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
  network: z.enum(CDP_BALANCE_NETWORKS).default("base"),
});

export type CdpTokenBalance = {
  contractAddress: string;
  network: string;
  symbol: string | null;
  name: string | null;
  amount: string;
  decimals: number;
};

export async function GET(request: NextRequest) {
  await connection();
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    address: searchParams.get("address"),
    network: searchParams.get("network") ?? "base",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" } },
      { status: 400 },
    );
  }

  const rl = await checkRateLimit(session.user.id, cdpBalanceRateLimit);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rl.headers },
    );
  }

  // Verify the queried address belongs to the authenticated user
  const ownsAddress = await verifyAddressOwnership(session.user.id, parsed.data.address);
  if (!ownsAddress) {
    return NextResponse.json(
      { success: false, error: { message: "Address not linked to your account" } },
      { status: 403 },
    );
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    return NextResponse.json(
      { success: false, error: { message: "CDP server not configured" } },
      { status: 503 },
    );
  }

  try {
    const result = await cdp.evm.listTokenBalances({
      address: parsed.data.address as `0x${string}`,
      network: parsed.data.network as CdpBalanceNetwork,
    });

    // Normalize CDP balance response for JSON serialization
    // CDP returns bigint for amount.amount — must convert to string
    // ListTokenBalancesResult: { balances: EvmTokenBalance[], nextPageToken? }
    // EvmTokenBalance: { token: EvmToken, amount: EvmTokenAmount }
    const balances: CdpTokenBalance[] = (result.balances ?? []).map((tb: { token: { contractAddress?: string; network?: string; symbol?: string; name?: string }; amount: { amount: bigint; decimals: number } }) => ({
      contractAddress: tb.token?.contractAddress ?? "native",
      network: tb.token?.network ?? parsed.data.network,
      symbol: tb.token?.symbol ?? null,
      name: tb.token?.name ?? null,
      amount: String(tb.amount?.amount ?? "0"),
      decimals: Number(tb.amount?.decimals ?? 18),
    }));

    return NextResponse.json({
      success: true,
      data: {
        address: parsed.data.address,
        network: parsed.data.network,
        balances,
      },
    });
  } catch (err) {
    logger.error("cdp_balances_fetch_failed", {
      error: err instanceof Error ? err.message : String(err),
      address: parsed.data.address,
      network: parsed.data.network,
    });
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch CDP token balances" } },
      { status: 502 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function verifyAddressOwnership(userId: string, address: string): Promise<boolean> {
  const { createClient } = await import("@/server/services/supabase/server");
  const supabase = await createClient();
  if (!supabase) return false;

  const { count } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .ilike("address", address);

  return (count ?? 0) > 0;
}
