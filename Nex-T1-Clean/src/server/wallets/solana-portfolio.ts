import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { getMintMetadataForMints } from "@/server/wallets/solana-metadata";
import type { WalletAssetSummary } from "@/lib/user/profile";

type RawTokenAccount = {
  mint?: string;
  amount?: string;
  tokenAmount?: { amount?: string; decimals?: number };
  decimals?: number;
  symbol?: string;
  name?: string;
};

export async function getSolanaTopAssets(owner: string, max: number = 3): Promise<WalletAssetSummary[]> {
  try {
    const res = await defaultHeliusClient.invokeRaw("helius_get_token_accounts_by_owner", { owner });
    const payload = res.toolResult ?? res.response?.toolResult ?? {};
    const items: RawTokenAccount[] = Array.isArray(payload)
      ? payload
      : (payload?.result ?? payload?.value ?? []);

    // Normalize and filter out zero balances
    const normalized = items
      .map((acc) => {
        const amount = (acc.tokenAmount?.amount ?? acc.amount ?? "0").toString();
        const decimals = typeof acc.tokenAmount?.decimals === "number" ? acc.tokenAmount.decimals : acc.decimals;
        const mint = acc.mint ?? null;
        return { mint, amount, decimals: typeof decimals === "number" ? decimals : null } as {
          mint: string | null;
          amount: string;
          decimals: number | null;
        };
      })
      .filter((t) => t.mint && isNonZero(t.amount));

    if (!normalized.length) return [];

    const metaMap = await getMintMetadataForMints(normalized.map((t) => t.mint!) as string[]);

    // Score by base units (BigInt) normalized using decimals
    const scored = normalized.map((t) => {
      const meta = t.mint ? metaMap[t.mint] : undefined;
      return {
        mint: t.mint!,
        amount: t.amount,
        decimals: t.decimals ?? meta?.decimals ?? 9,
        symbol: meta?.symbol ?? undefined,
        name: meta?.name ?? undefined,
        icon: meta?.image ?? undefined,
      };
    });

    scored.sort((a, b) => {
      try {
        const aval = BigInt(a.amount);
        const bval = BigInt(b.amount);
        // Compare in base units (same scale not guaranteed, but good heuristic)
        return bval === aval ? (b.decimals - a.decimals) : (bval > aval ? 1 : -1);
      } catch {
        return 0;
      }
    });

    return scored.slice(0, Math.max(1, max)).map((item) => ({
      icon: item.icon ?? null,
      symbol: item.symbol ?? item.name ?? "TOKEN",
      name: item.name ?? item.symbol ?? null,
    }));
  } catch {
    return [];
  }
}

function isNonZero(amount: string) {
  try {
    return BigInt(amount) > 0n;
  } catch {
    return false;
  }
}
