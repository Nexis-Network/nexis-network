import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest } from "@/server/moralis/client";
import { normalizeSolanaAddress, normalizeSolanaNetwork, type SolanaNetwork } from "@/server/moralis/validation";

export type MoralisSolTokenPriceResponse = Record<string, UntypedJson>;

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/price/get-sol-token-price?network=mainnet&address=...
export async function getSolanaTokenPrice(params: {
  network?: SolanaNetwork | string | null;
  address: string;
  currency?: "usd" | "eur" | "sol";
}): Promise<MoralisSolTokenPriceResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisSolTokenPriceResponse>({
    api: "solana",
    path: `/token/${network}/${address}/price`,
    query: {
      currency: params.currency ?? "usd",
    },
    cache: {
      ...MORALIS_CACHE.tokenPrices,
      tags: [`sol:${network}`, `token:${address}`, "sol:token_price"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/price/get-multiple-token-prices?addresses=[...]&network=mainnet
export async function getSolanaTokenPricesBatch(params: {
  network?: SolanaNetwork | string | null;
  addresses: string[];
  currency?: "usd" | "eur" | "sol";
}): Promise<Array<Record<string, UntypedJson>>> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const addresses = params.addresses.map((a) => normalizeSolanaAddress(a));

  const payload = await moralisRequest<UntypedJson>({
    api: "solana",
    path: `/token/${network}/prices`,
    method: "POST",
    query: { currency: params.currency ?? "usd" },
    body: { addresses },
    cache: {
      ...MORALIS_CACHE.tokenPrices,
      tags: [`sol:${network}`, "sol:token_prices_batch"],
    },
  });

  return Array.isArray(payload) ? (payload as Array<Record<string, UntypedJson>>) : [];
}

