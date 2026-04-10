import { connection, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { getExtensionAssetLive } from "@/server/market/extension-asset";


const querySchema = z
  .object({
    chainId: z.string().trim().min(1).default("1"),
    address: z.string().trim().optional(),
    symbol: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.address && !value.symbol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "address_or_symbol_required",
        path: ["address"],
      });
    }
  });

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      chainId: searchParams.get("chainId") ?? "1",
      address: searchParams.get("address") ?? undefined,
      symbol: searchParams.get("symbol") ?? undefined,
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

    const live = await getExtensionAssetLive(parsed.data);
    return NextResponse.json(live, { status: 200 });
  } catch (error) {
    logger.error("[extension][market][asset-live] failed", error);
    return NextResponse.json(
      {
        error: "asset_live_unavailable",
      },
      { status: 500 },
    );
  }
}
