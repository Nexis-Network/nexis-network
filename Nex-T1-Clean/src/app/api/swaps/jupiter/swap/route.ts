import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getJupiterSwapTransaction } from "@/server/services/jupiter/client";

/**
 * POST /api/swaps/jupiter/swap
 *
 * Builds a serialized Solana transaction for a Jupiter swap.
 * The client must sign and submit the returned base64 transaction
 * (via CDP's sendSolanaTransaction or wallet adapter).
 */

const bodySchema = z.object({
  quoteResponse: z.object({
    inputMint: z.string(),
    inAmount: z.string(),
    outputMint: z.string(),
    outAmount: z.string(),
    otherAmountThreshold: z.string(),
    swapMode: z.string(),
    slippageBps: z.number(),
    priceImpactPct: z.string(),
    routePlan: z.array(z.object({
      swapInfo: z.object({
        ammKey: z.string(),
        label: z.string(),
        inputMint: z.string(),
        outputMint: z.string(),
        inAmount: z.string(),
        outAmount: z.string(),
        feeAmount: z.string(),
        feeMint: z.string(),
      }),
      percent: z.number(),
    })),
    contextSlot: z.number().optional(),
    timeTaken: z.number().optional(),
  }),
  userPublicKey: z.string().min(32, "Invalid Solana public key"),
  wrapAndUnwrapSol: z.boolean().optional(),
  computeUnitPriceMicroLamports: z.number().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" } },
      { status: 400 },
    );
  }

  try {
    const result = await getJupiterSwapTransaction({
      quoteResponse: parsed.data.quoteResponse,
      userPublicKey: parsed.data.userPublicKey,
      wrapAndUnwrapSol: parsed.data.wrapAndUnwrapSol,
      computeUnitPriceMicroLamports: parsed.data.computeUnitPriceMicroLamports,
    });

    return NextResponse.json({
      success: true,
      data: {
        swapTransaction: result.swapTransaction,
        lastValidBlockHeight: result.lastValidBlockHeight,
        prioritizationFeeLamports: result.prioritizationFeeLamports,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jupiter swap tx build failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 },
    );
  }
}
