import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCdpClient } from "@/server/services/cdp/client";
import { logger } from "@/lib/logger";

/**
 * POST /api/swaps/cdp/quote
 *
 * Gets a CDP swap quote for an EVM token swap.
 * Uses the CDP SDK server-side to fetch a quote from CDP's swap API.
 * The response includes a transaction object that can be executed
 * client-side via sendUserOperation (Smart Account) or sendEvmTransaction (EOA).
 *
 * Supported networks: base, ethereum, arbitrum, optimism
 */

const bodySchema = z.object({
  network: z.enum(["base", "ethereum", "arbitrum", "optimism"]),
  fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid from token address"),
  toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid to token address"),
  /** Amount in base units (wei for ETH, smallest unit for ERC-20) */
  fromAmount: z.string().regex(/^\d+$/, "Amount must be an integer string"),
  /** The address that will receive the swap output */
  taker: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid taker address"),
  /** The EOA signer address (required if taker is a smart account) */
  signerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  /** Slippage in basis points (0-10000). Default 50 = 0.5% */
  slippageBps: z.number().int().min(0).max(10000).optional(),
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
    const cdp = await getCdpClient();
    if (!cdp) {
      return NextResponse.json(
        { success: false, error: { message: "CDP server SDK not configured" } },
        { status: 503 },
      );
    }
    const quote = await cdp.evm.getSwapPrice({
      network: parsed.data.network,
      fromToken: parsed.data.fromToken as `0x${string}`,
      toToken: parsed.data.toToken as `0x${string}`,
      fromAmount: BigInt(parsed.data.fromAmount),
      taker: parsed.data.taker as `0x${string}`,
      signerAddress: parsed.data.signerAddress as `0x${string}` | undefined,
      slippageBps: parsed.data.slippageBps,
    });

    if (!quote.liquidityAvailable) {
      return NextResponse.json({
        success: true,
        data: { liquidityAvailable: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        liquidityAvailable: true,
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: quote.fromAmount.toString(),
        toAmount: quote.toAmount.toString(),
        minToAmount: quote.minToAmount.toString(),
        blockNumber: quote.blockNumber.toString(),
        fees: quote.fees,
      },
    });
  } catch (err) {
    logger.error("CDP swap quote failed", { error: err });
    const message = err instanceof Error ? err.message : "CDP swap quote failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 },
    );
  }
}
