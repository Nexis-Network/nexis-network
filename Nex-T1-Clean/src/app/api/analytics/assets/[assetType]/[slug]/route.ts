import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";

import { getAssetSnapshot } from "@/server/market/token-asset";


type RouteContext = {
  params: Promise<{
    assetType: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  try {
    const { assetType, slug } = await context.params;
    if (!slug) {
      return apiResponse.badRequest("Asset slug is required");
    }

    const normalizedType = (assetType ?? "token").toLowerCase();
    if (!["token", "coin", "nft"].includes(normalizedType)) {
      return apiResponse.badRequest("Unsupported asset type");
    }

    const result = await getAssetSnapshot(normalizedType === "nft" ? "nft" : "token", slug);
    const response = apiResponse.success(result);
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    return response;
  } catch (error) {
    const status = typeof (error as { status?: number } | null)?.status === "number" ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : "Unable to load asset snapshot";
    const code = status >= 500 ? "INTERNAL_ERROR" : "ASSET_LOAD_ERROR";
    return apiResponse.error(code, message, status);
  }
}
