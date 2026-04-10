import { connection, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { getExtensionNftDetailScaffold } from "@/server/market/extension-asset";


const querySchema = z.object({
  chainId: z.string().trim().min(1).default("1"),
  contractAddress: z.string().trim().optional(),
  tokenId: z.string().trim().optional(),
});

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      chainId: searchParams.get("chainId") ?? "1",
      contractAddress: searchParams.get("contractAddress") ?? undefined,
      tokenId: searchParams.get("tokenId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_query",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const scaffold = getExtensionNftDetailScaffold(parsed.data);
    return NextResponse.json(scaffold, { status: 200 });
  } catch (error) {
    logger.error("[extension][nft][detail] failed", error);
    return NextResponse.json(
      {
        error: "nft_detail_unavailable",
      },
      { status: 500 },
    );
  }
}
