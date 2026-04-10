import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { withVendorCache, vendorCacheKey } from "@/lib/vendors/base";

export type SolanaMintMetadata = {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  image?: string | null;
  decimals?: number | null;
  verified?: boolean | null;
};

const TTL_SECONDS = 60 * 60; // 1 hour

const COMMON_MINTS: Record<string, SolanaMintMetadata> = {
  // Mainnet
  So11111111111111111111111111111111111111112: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    image: '/icons/chain-icons/solana.svg',
    decimals: 9,
    verified: true,
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    image: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
    decimals: 6,
    verified: true,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    image: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
    decimals: 6,
    verified: true,
  },
  // Devnet common
  De1EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTD: {
    mint: 'De1EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTD',
    symbol: 'USDC',
    name: 'USD Coin (Devnet)',
    image: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
    decimals: 6,
    verified: false,
  },
};

function fallbackForMint(mint: string): SolanaMintMetadata | null {
  return COMMON_MINTS[mint] ?? null;
}

async function fetchMintMetadata(mint: string): Promise<SolanaMintMetadata | null> {
  try {
    const res = await defaultHeliusClient.invokeRaw("helius_get_asset", { id: mint });
    const payload = res.toolResult ?? res.response?.toolResult ?? {};
    const content = payload?.content ?? payload?.result?.content ?? {};
    const metadata = content?.metadata ?? payload?.metadata ?? {};
    const decimals =
      typeof payload?.token_info?.decimals === "number"
        ? payload.token_info.decimals
        : typeof metadata?.decimals === "number"
          ? metadata.decimals
          : null;
    const symbol =
      typeof payload?.token_info?.symbol === "string"
        ? payload.token_info.symbol
        : typeof metadata?.symbol === "string"
          ? metadata.symbol
          : null;
    const name =
      typeof payload?.token_info?.name === "string"
        ? payload.token_info.name
        : typeof metadata?.name === "string"
          ? metadata.name
          : null;
    const image =
      typeof metadata?.image === "string"
        ? metadata.image
        : typeof content?.links?.image === "string"
          ? content.links.image
          : null;
    const verified =
      typeof payload?.token_info?.verified === "boolean"
        ? payload.token_info.verified
        : (payload?.verified as boolean | undefined) ?? null;
    return { mint, symbol, name, image, decimals, verified };
  } catch {
    return fallbackForMint(mint);
  }
}

export async function getMintMetadataForMints(mints: string[]): Promise<Record<string, SolanaMintMetadata>> {
  const unique = Array.from(new Set(mints.filter((m) => typeof m === "string" && m.length > 20)));
  const out: Record<string, SolanaMintMetadata> = {};

  await Promise.all(
    unique.map(async (mint) => {
      const key = vendorCacheKey(["helius", "asset", mint]);
      const { data } = await withVendorCache(key, TTL_SECONDS, async () => {
        const meta = await fetchMintMetadata(mint);
        return meta ?? ({ mint } as SolanaMintMetadata);
      });
      out[mint] = data;
    }),
  );

  return out;
}
