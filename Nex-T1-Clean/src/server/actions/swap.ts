"use server";

import { getZeroExSwapQuote, ZeroExQuoteParams } from "@/server/swap/0x";

export async function getSwapQuoteAction(params: ZeroExQuoteParams) {
  try {
    const quote = await getZeroExSwapQuote(params);
    return { success: true, data: quote };
  } catch (error) {
    // Return a safe error object
    return { success: false, error: error instanceof Error ? error.message : "Swap quote failed" };
  }
}
