import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";
import { mapSolanaNftsToUnified, toUnifiedSolanaChain } from "@/server/moralis/solana/wallet";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  network: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  excludeSpam: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
  nftMetadata: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
  mediaItems: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
  includeFungibleAssets: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.sol.nfts.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.nfts", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      network: url.searchParams.get("network") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      excludeSpam: url.searchParams.get("excludeSpam") ?? undefined,
      nftMetadata: url.searchParams.get("nftMetadata") ?? undefined,
      mediaItems: url.searchParams.get("mediaItems") ?? undefined,
      includeFungibleAssets: url.searchParams.get("includeFungibleAssets") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeSolanaAddress(parsed.data.address);
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const chain = toUnifiedSolanaChain(network);

      const summary = await fetchNexSolanaWalletSummary(address, {
        includeTokens: false,
        includeNfts: true,
        includeTransactions: false,
        limit: parsed.data.limit ?? 25,
        nftsCursor: parsed.data.cursor ? Number(parsed.data.cursor) : 0,
        skipCache: false,
      });

      const nfts = mapSolanaNftsToUnified(
        {
          assets: summary.nfts.map((nft) => {
            const record = nft as Record<string, UntypedJson>;
            const content =
              record.content && typeof record.content === "object"
                ? (record.content as Record<string, UntypedJson>)
                : {};
            const metadata =
              content.metadata && typeof content.metadata === "object"
                ? (content.metadata as Record<string, UntypedJson>)
                : {};

            return {
              mint: record.id ?? record.mint ?? null,
              name: metadata.name ?? record.name ?? null,
              description: metadata.description ?? null,
              image: metadata.image ?? null,
              amount: "1",
            };
          }),
        },
        chain,
      );
      const cursor = summary.nextNftsCursor?.toString() ?? null;
      const response = apiResponse.success({ address, chain, nfts, cursor });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=600");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
