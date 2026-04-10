import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getWalletHoldingsAggregate } from "@/server/settings/wallet-aggregator";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { paginateList } from "@/lib/pagination";


export async function GET(request: Request) {
  await connection();
  return timeApiRoute("settings.wallets.holdings.GET", async () => {
    const url = new URL(request.url);
    const walletId = url.searchParams.get("walletId")?.trim() || null;
    const cursorTokens = Number(url.searchParams.get("tokensCursor") ?? "0") || 0;
    const cursorNfts = Number(url.searchParams.get("nftsCursor") ?? "0") || 0;
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? "25") || 25));

    const jar = await cookies();
    const bridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });

    if (!context?.userId) {
      return bridge.commit(apiResponse.unauthorized());
    }

    const aggregate = await getWalletHoldingsAggregate(String(context.userId));

    const filteredTokens = walletId
      ? aggregate.tokens.filter((token) => token.walletId === walletId)
      : aggregate.tokens;
    const filteredNfts = walletId
      ? aggregate.nfts.filter((nft) => nft.walletId === walletId)
      : aggregate.nfts;
    const filteredAddressSet = new Set(
      [...filteredTokens.map((token) => token.walletAddress), ...filteredNfts.map((nft) => nft.walletAddress)].map(
        (address) => address.toLowerCase(),
      ),
    );
    const filteredEns =
      walletId && filteredAddressSet.size > 0
        ? aggregate.ens.filter((entry) => filteredAddressSet.has(entry.address.toLowerCase()))
        : walletId
          ? []
          : aggregate.ens;

    const tokensPage = paginateList(filteredTokens, cursorTokens, limit);
    const nftsPage = paginateList(filteredNfts, cursorNfts, limit);

    const response = apiResponse.success({
      generatedAt: aggregate.generatedAt,
      tokens: tokensPage.items,
      tokensNextCursor: tokensPage.nextCursor,
      nfts: nftsPage.items,
      nftsNextCursor: nftsPage.nextCursor,
      ens: filteredEns,
    });
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return bridge.commit(response);
  });
}
