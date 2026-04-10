import { z } from 'zod';

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const numericStringSchema = z.string().regex(/^\d+$/);

export const checkApprovalSchema = z.object({
  walletAddress: addressSchema,
  token: addressSchema,
  amount: numericStringSchema,
  chainId: z.number().int().positive(),
});

export const quoteSchema = z.object({
  swapper: addressSchema,
  tokenIn: addressSchema,
  tokenOut: addressSchema,
  tokenInChainId: numericStringSchema,
  tokenOutChainId: numericStringSchema,
  amount: numericStringSchema,
  type: z.enum(['EXACT_INPUT', 'EXACT_OUTPUT']),
  slippageTolerance: z.number().min(0).max(100).optional(),
  autoSlippage: z.boolean().optional(),
  protocols: z.array(z.string()).optional(),
  routingPreference: z.enum(['BEST_PRICE', 'FASTEST', 'CLASSIC']).optional(),
  urgency: z.enum(['normal', 'fast']).optional(),
});

export const lpCreateSchema = z.object({
  walletAddress: addressSchema,
  poolAddress: addressSchema,
  token0: addressSchema,
  token1: addressSchema,
  amount0Preferred: numericStringSchema,
  amount1Preferred: numericStringSchema,
  tickLower: z.number().int(),
  tickUpper: z.number().int(),
  chainId: z.number().int().positive(),
});

export const lpIncreaseSchema = z.object({
  walletAddress: addressSchema,
  tokenId: z.string(),
  amount0Preferred: numericStringSchema,
  amount1Preferred: numericStringSchema,
  chainId: z.number().int().positive(),
});

export const lpDecreaseSchema = z.object({
  walletAddress: addressSchema,
  tokenId: z.string(),
  liquidity: numericStringSchema,
  amount0Min: numericStringSchema,
  amount1Min: numericStringSchema,
  chainId: z.number().int().positive(),
});

export const lpClaimSchema = z.object({
  walletAddress: addressSchema,
  tokenId: z.string(),
  chainId: z.number().int().positive(),
});
