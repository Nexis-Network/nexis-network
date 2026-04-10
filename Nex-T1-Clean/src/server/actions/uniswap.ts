'use server';

import { 
  getQuote as serviceGetQuote,
  checkApproval as serviceCheckApproval,
  createSwapExecution as serviceCreateSwapExecution,
  getSwappableTokens as serviceGetSwappableTokens,
} from '@/server/services/uniswap/client';
import { 
  QuoteRequestParams, 
  CheckApprovalParams,
  QuoteResponse
} from '@/server/services/uniswap/types';
import { 
  quoteSchema, 
  checkApprovalSchema 
} from '@/server/services/uniswap/validation';

export async function checkApprovalAction(params: CheckApprovalParams) {
  try {
    const validated = checkApprovalSchema.parse(params);
    const result = await serviceCheckApproval(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getQuoteAction(params: QuoteRequestParams) {
  try {
    const validated = quoteSchema.parse(params);
    const result = await serviceGetQuote(validated);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function submitSwapAction(quoteResponse: QuoteResponse, signature?: string) {
  try {
    const result = await serviceCreateSwapExecution(quoteResponse, signature);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getSwappableTokensAction(chainId: number) {
  try {
    const result = await serviceGetSwappableTokens(chainId);
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
