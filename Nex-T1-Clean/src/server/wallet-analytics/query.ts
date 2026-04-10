import type {
  WalletAnalyticsPosition,
  WalletAnalyticsSummary,
} from "@/lib/user/profile";
import {
  getSupabaseErrorMessage,
  isMissingSchemaObjectError,
} from "@/lib/errors/supabase";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";

type WalletAnalyticsRow = {
  id: string;
  wallet_id: string;
  address: string;
  chain_id: number | null;
  provider: string | null;
  metadata: Record<string, UntypedJson> | null;
  positions: Array<Record<string, UntypedJson>>;
};

function isExpectedWalletAnalyticsSchemaError(error: unknown): boolean {
  const message = getSupabaseErrorMessage(error) ?? "";
  return (
    isMissingSchemaObjectError(error) &&
    /(wallet_accounts|wallet_positions)/i.test(message)
  );
}

function toNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePosition(row: Record<string, UntypedJson>): WalletAnalyticsPosition | null {
  const assetType = typeof row.asset_type === "string" ? row.asset_type : typeof row.assetType === "string" ? row.assetType : "other";
  return {
    assetType,
    symbol: typeof row.symbol === "string" ? row.symbol : null,
    name: typeof row.name === "string" ? row.name : null,
    quantity: toNumber(row.quantity),
    quantityUsd: toNumber(row.quantity_usd ?? row.quantityUsd),
    costBasisUsd: toNumber(row.cost_basis_usd ?? row.costBasisUsd),
    unrealizedPnlUsd: toNumber(row.unrealized_pnl_usd ?? row.unrealizedPnlUsd),
    lastPriceUsd: toNumber(row.last_price_usd ?? row.lastPriceUsd),
    priceChange24h: toNumber(row.price_change_24h ?? row.priceChange24h),
    contractAddress: typeof row.contract_address === "string" ? row.contract_address : typeof row.contractAddress === "string" ? row.contractAddress : null,
    tokenId: typeof row.token_id === "string" ? row.token_id : typeof row.tokenId === "string" ? row.tokenId : null,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? (row.metadata as Record<string, UntypedJson>) : null,
  };
}

export function computeWalletAnalyticsTotals(positions: WalletAnalyticsPosition[]) {
  let total = 0;
  let native = 0;
  let tokens = 0;
  let nfts = 0;
  let costBasis = 0;
  let unrealized = 0;
  let weightedChange = 0;

  positions.forEach((position) => {
    const value = toNumber(position.quantityUsd) ?? 0;
    total += value;
    if (position.assetType === "native") {
      native += value;
    } else if (position.assetType === "erc20" || position.assetType === "spl" || position.assetType === "other") {
      tokens += value;
    } else if (position.assetType === "erc721" || position.assetType === "spl_nft") {
      nfts += value;
    }

    const basis = toNumber(position.costBasisUsd);
    if (basis != null) {
      costBasis += basis;
    }

    const pnl = toNumber(position.unrealizedPnlUsd);
    if (pnl != null) {
      unrealized += pnl;
    }

    const change = toNumber(position.priceChange24h);
    if (change != null && value > 0) {
      weightedChange += value * change;
    }
  });

  const changePercent = total > 0 ? weightedChange / total : null;

  return {
    valueUsd: total || null,
    nativeValueUsd: native || null,
    tokenValueUsd: tokens || null,
    nftValueUsd: nfts || null,
    costBasisUsd: costBasis || null,
    unrealizedPnlUsd: unrealized || null,
    change24hPercent: changePercent,
  };
}

export async function getUserWalletAnalytics(
  userId: string,
): Promise<Map<string, WalletAnalyticsSummary>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select(
      `
        id,
        wallet_id,
        address,
        chain_id,
        provider,
        metadata,
        positions:wallet_positions (
          asset_type,
          chain_id,
          contract_address,
          token_id,
          symbol,
          name,
          decimals,
          quantity,
          quantity_usd,
          cost_basis_usd,
          unrealized_pnl_usd,
          last_price_usd,
          price_change_24h,
          metadata
        )
      `,
    )
    .eq("user_id", userId)
    .returns<WalletAnalyticsRow[]>();

  if (error) {
    if (isExpectedWalletAnalyticsSchemaError(error)) {
      return new Map();
    }

    throw new Error(`Failed to query wallet analytics: ${error.message}`);
  }

  const result = new Map<string, WalletAnalyticsSummary>();

  for (const row of data ?? []) {
    const positions = Array.isArray(row.positions)
      ? row.positions
          .map((entry) => normalizePosition(entry))
          .filter((entry): entry is WalletAnalyticsPosition => entry !== null)
      : [];

    const totals = computeWalletAnalyticsTotals(positions);

    result.set(row.wallet_id, {
      accountId: row.id,
      walletId: row.wallet_id,
      totals,
      positions,
      snapshotAt: null,
    });
  }

  return result;
}
