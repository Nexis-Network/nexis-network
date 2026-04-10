/**
 * CoW Protocol API types — Zod-validated request/response schemas.
 *
 * Covers:
 * - Quote requests & responses
 * - Order creation & status
 * - PreSign calldata generation for Safe smart wallets
 * - Chain configuration (Mainnet, Gnosis, Arbitrum, Base, Sepolia)
 *
 * @see https://docs.cow.fi/cow-protocol/reference/apis/orderbook
 */

import { z } from "zod";

// ─── Chain Configuration ────────────────────────────────────────
export const COW_SUPPORTED_CHAIN_IDS = [1, 100, 42161, 8453, 11155111] as const;
export type CowChainId = (typeof COW_SUPPORTED_CHAIN_IDS)[number];

export const COW_API_BASE_URLS: Record<CowChainId, string> = {
  1: "https://api.cow.fi/mainnet",
  100: "https://api.cow.fi/xdai",
  42161: "https://api.cow.fi/arbitrum_one",
  8453: "https://api.cow.fi/base",
  11155111: "https://api.cow.fi/sepolia",
};

/** CoW Protocol GPv2Settlement contract — same address on all supported chains. */
export const COW_SETTLEMENT_CONTRACT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41" as const;

/** CoW Protocol GPv2VaultRelayer — approval target. */
export const COW_VAULT_RELAYER = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110" as const;

// ─── Enums ──────────────────────────────────────────────────────
export const OrderKindSchema = z.enum(["sell", "buy"]);
export type OrderKind = z.infer<typeof OrderKindSchema>;

export const SigningSchemeSchema = z.enum(["eip712", "ethsign", "presign", "eip1271"]);
export type SigningScheme = z.infer<typeof SigningSchemeSchema>;

export const OrderStatusSchema = z.enum([
  "presignaturePending",
  "open",
  "fulfilled",
  "cancelled",
  "expired",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const SellTokenSourceSchema = z.enum(["erc20", "internal", "external"]);
export const BuyTokenDestSchema = z.enum(["erc20", "internal"]);

// ─── Quote Request ──────────────────────────────────────────────
export const CowQuoteRequestSchema = z.object({
  sellToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  buyToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  /** Exactly one of sellAmountBeforeFee or buyAmountAfterFee must be set. */
  sellAmountBeforeFee: z.string().optional(),
  buyAmountAfterFee: z.string().optional(),
  kind: OrderKindSchema,
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  receiver: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  validTo: z.number().int().positive().optional(),
  appData: z.string().optional(),
  partiallyFillable: z.boolean().default(false),
  sellTokenBalance: SellTokenSourceSchema.optional(),
  buyTokenBalance: BuyTokenDestSchema.optional(),
  signingScheme: SigningSchemeSchema.optional(),
  onchainOrder: z.boolean().optional(),
});
export type CowQuoteRequest = z.infer<typeof CowQuoteRequestSchema>;

// ─── Quote Response ─────────────────────────────────────────────
export const CowQuoteResponseSchema = z.object({
  quote: z.object({
    sellToken: z.string(),
    buyToken: z.string(),
    receiver: z.string().nullable(),
    sellAmount: z.string(),
    buyAmount: z.string(),
    validTo: z.number(),
    appData: z.string(),
    feeAmount: z.string(),
    kind: OrderKindSchema,
    partiallyFillable: z.boolean(),
    sellTokenBalance: z.string().optional(),
    buyTokenBalance: z.string().optional(),
  }),
  from: z.string(),
  expiration: z.string(),
  id: z.number().optional(),
  verified: z.boolean().optional(),
});
export type CowQuoteResponse = z.infer<typeof CowQuoteResponseSchema>;

// ─── Order Creation ─────────────────────────────────────────────
export const CowOrderCreationSchema = z.object({
  sellToken: z.string(),
  buyToken: z.string(),
  receiver: z.string().nullable().optional(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  validTo: z.number(),
  appData: z.string(),
  feeAmount: z.string(),
  kind: OrderKindSchema,
  partiallyFillable: z.boolean(),
  sellTokenBalance: z.string().optional(),
  buyTokenBalance: z.string().optional(),
  signingScheme: SigningSchemeSchema,
  signature: z.string(),
  from: z.string(),
});
export type CowOrderCreation = z.infer<typeof CowOrderCreationSchema>;

// ─── Order Detail ───────────────────────────────────────────────
export const CowOrderDetailSchema = z.object({
  uid: z.string(),
  sellToken: z.string(),
  buyToken: z.string(),
  receiver: z.string().nullable(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  validTo: z.number(),
  appData: z.string(),
  feeAmount: z.string(),
  kind: z.string(),
  partiallyFillable: z.boolean(),
  status: OrderStatusSchema,
  creationDate: z.string(),
  owner: z.string(),
  executedSellAmount: z.string().optional(),
  executedBuyAmount: z.string().optional(),
  executedSellAmountBeforeFees: z.string().optional(),
  executedFeeAmount: z.string().optional(),
  invalidated: z.boolean().optional(),
  signingScheme: z.string().optional(),
  class: z.string().optional(),
  fullFeeAmount: z.string().optional(),
  availableBalance: z.string().optional(),
});
export type CowOrderDetail = z.infer<typeof CowOrderDetailSchema>;

// ─── Trade Record ───────────────────────────────────────────────
export const CowTradeRecordSchema = z.object({
  blockNumber: z.number(),
  logIndex: z.number(),
  orderUid: z.string(),
  owner: z.string(),
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string(),
  buyAmount: z.string(),
  sellAmountBeforeFees: z.string().optional(),
  txHash: z.string(),
});
export type CowTradeRecord = z.infer<typeof CowTradeRecordSchema>;

// ─── Utility: PreSign calldata builder ──────────────────────────
/**
 * Builds the ABI-encoded calldata for `GPv2Settlement.setPreSignature(bytes orderUid, bool signed)`.
 *
 * Function signature: setPreSignature(bytes,bool)
 * Selector: 0xec6cb13f
 *
 * @param orderUid  The order UID returned by CoW after order submission (hex string)
 * @param signed    Whether to presign (true) or revoke (false)
 */
export function buildPreSignCalldata(orderUid: string, signed = true): string {
  // setPreSignature(bytes orderUid, bool signed)
  // Selector: 0xec6cb13f
  const selector = "0xec6cb13f";

  // Remove 0x prefix from orderUid
  const uidHex = orderUid.startsWith("0x") ? orderUid.slice(2) : orderUid;

  // ABI encoding:
  // offset for bytes (0x40 = 64 in decimal, since bool is at 0x20)
  // bool signed
  // bytes length
  // bytes data (padded to 32-byte boundary)
  const offset = "0000000000000000000000000000000000000000000000000000000000000040";
  const boolValue = signed
    ? "0000000000000000000000000000000000000000000000000000000000000001"
    : "0000000000000000000000000000000000000000000000000000000000000000";

  const bytesLen = Math.ceil(uidHex.length / 2);
  const bytesLenHex = bytesLen.toString(16).padStart(64, "0");

  // Pad uidHex to 32-byte boundary
  const paddedUid = uidHex.padEnd(Math.ceil(uidHex.length / 64) * 64, "0");

  return `${selector}${offset}${boolValue}${bytesLenHex}${paddedUid}`;
}

/**
 * Checks if a given chainId is supported by CoW Protocol.
 */
export function isCowSupportedChain(chainId: number): chainId is CowChainId {
  return (COW_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);
}

/**
 * Returns the CoW API base URL for a given chainId.
 * @throws if chainId is not supported
 */
export function getCowApiBaseUrl(chainId: number): string {
  if (!isCowSupportedChain(chainId)) {
    throw new Error(`CoW Protocol does not support chainId ${chainId}. Supported: ${COW_SUPPORTED_CHAIN_IDS.join(", ")}`);
  }
  return COW_API_BASE_URLS[chainId];
}

/**
 * Default appData hash for our application.
 * This is a keccak256 hash of our app metadata JSON.
 * See: https://docs.cow.fi/cow-protocol/reference/core/intents/app-data
 */
export const DEFAULT_APP_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Default order validity: 30 minutes from now.
 */
export function defaultValidTo(): number {
  return Math.floor(Date.now() / 1000) + 30 * 60;
}
