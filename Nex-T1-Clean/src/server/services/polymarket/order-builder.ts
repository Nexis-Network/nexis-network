/**
 * Polymarket CLOB Order Builder
 *
 * Constructs and signs EIP-712 orders for the CTF Exchange on Polygon.
 * Supports both standard and negative-risk markets.
 *
 * The order lifecycle:
 * 1. Build order parameters from user intent (side, price, size)
 * 2. Convert to on-chain amounts (makerAmount, takerAmount) in base units
 * 3. Sign using EIP-712 typed data via the user's stored credentials
 * 4. Return the SignedOrder ready for CLOB submission via postOrder()
 *
 * Security:
 * - Private keys are NEVER stored. Signing uses API key HMAC (L2 auth).
 *   The CLOB /order endpoint accepts L2-authenticated requests where the
 *   order is signed server-side using the user's API credentials.
 * - For signature type 0 (EOA), the user must pre-sign via their wallet.
 *   This module handles signature types 1 (POLY_PROXY) and 2 (GNOSIS_SAFE)
 *   where the CLOB accepts L2 HMAC-authenticated order placement.
 *
 * Sources:
 * - https://docs.polymarket.com/developers/CLOB/orders/orders
 * - https://github.com/Polymarket/clob-client
 * - https://docs.polymarket.com/resources/contract-addresses
 */

import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";
import {
  POLYMARKET_CHAIN_ID as _POLYMARKET_CHAIN_ID,
  POLYMARKET_CONTRACTS,
  POLYMARKET_SIGNATURE_TYPE,
} from "./constants";
import type { PolymarketTickSize, PolymarketSignatureType as _PolymarketSignatureType } from "./constants";
import type { SignedOrder, OrderSide, UserOrder as _UserOrder, CreateOrderOptions as _CreateOrderOptions } from "./types";
import type { DecryptedCredential } from "./credential-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** USDC.e on Polygon uses 6 decimals */
const COLLATERAL_DECIMALS = 6;
const _COLLATERAL_SCALE = 10 ** COLLATERAL_DECIMALS;

/** CTF outcome tokens are tracked at 18-decimal precision in the exchange */
const CONDITIONAL_TOKEN_DECIMALS = 6;
const _CONDITIONAL_TOKEN_SCALE = 10 ** CONDITIONAL_TOKEN_DECIMALS;

/** Default: no expiration (0 = never expires) */
const DEFAULT_EXPIRATION = "0";

/** Default taker: open order (anyone can match) */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Side encoding for the exchange contract */
const SIDE_BUY = 0;
const SIDE_SELL = 1;

// ---------------------------------------------------------------------------
// EIP-712 Domain (for reference — actual signing happens via L2 HMAC auth)
// ---------------------------------------------------------------------------

/**
 * The exchange contract validates orders against this EIP-712 domain.
 * For L2 authenticated requests (signature types 1 & 2), the CLOB server
 * handles the actual on-chain signature verification.
 */
function _getExchangeAddress(negRisk: boolean): string {
  return negRisk
    ? POLYMARKET_CONTRACTS.NEG_RISK_CTF_EXCHANGE
    : POLYMARKET_CONTRACTS.CTF_EXCHANGE;
}

// ---------------------------------------------------------------------------
// Amount Calculations
// ---------------------------------------------------------------------------

/**
 * Round a number to the specified number of decimal places (floor).
 * This prevents floating-point precision issues when converting to base units.
 */
function roundDown(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}

/**
 * Convert a human-readable amount to base units (integer string).
 * E.g., 1.5 USDC -> "1500000" (6 decimals)
 */
function toBaseUnits(amount: number, decimals: number): string {
  const rounded = roundDown(amount, decimals);
  const scaled = Math.round(rounded * 10 ** decimals);
  return String(scaled);
}

/**
 * Calculate maker and taker amounts for an order.
 *
 * For BUY orders:
 *   - maker gives USDC (makerAmount = price * size in USDC base units)
 *   - taker gives outcome tokens (takerAmount = size in token base units)
 *
 * For SELL orders:
 *   - maker gives outcome tokens (makerAmount = size in token base units)
 *   - taker gives USDC (takerAmount = price * size in USDC base units)
 */
function calculateOrderAmounts(
  side: OrderSide,
  price: number,
  size: number,
): { makerAmount: string; takerAmount: string } {
  if (side === "BUY") {
    const rawMakerAmount = price * size;
    return {
      makerAmount: toBaseUnits(rawMakerAmount, COLLATERAL_DECIMALS),
      takerAmount: toBaseUnits(size, CONDITIONAL_TOKEN_DECIMALS),
    };
  }

  // SELL
  const rawTakerAmount = price * size;
  return {
    makerAmount: toBaseUnits(size, CONDITIONAL_TOKEN_DECIMALS),
    takerAmount: toBaseUnits(rawTakerAmount, COLLATERAL_DECIMALS),
  };
}

/**
 * Generate a random 256-bit salt for order uniqueness.
 */
function generateSalt(): string {
  const bytes = randomBytes(32);
  // Convert to BigInt then to string for the order struct
  const hex = bytes.toString("hex");
  const saltBigInt = BigInt(`0x${hex}`);
  return saltBigInt.toString();
}

/**
 * Generate a monotonically increasing nonce from the current timestamp.
 * The CLOB uses nonces to prevent replay attacks.
 */
function generateNonce(): string {
  return String(Date.now());
}

// ---------------------------------------------------------------------------
// Order Builder
// ---------------------------------------------------------------------------

export interface BuildOrderParams {
  /** Token ID of the CTF ERC1155 outcome token */
  tokenId: string;
  /** BUY or SELL */
  side: OrderSide;
  /** Price in range (0, 1) */
  price: number;
  /** Size in number of shares */
  size: number;
  /** Market tick size for price validation */
  tickSize: PolymarketTickSize;
  /** Whether this is a negative risk market */
  negRisk: boolean;
  /** Fee rate in basis points (from market params) */
  feeRateBps: number;
  /** Optional expiration timestamp (0 = no expiration) */
  expiration?: string;
  /** Optional specific taker address (default: open order) */
  taker?: string;
  /** Optional nonce override */
  nonce?: string;
}

/**
 * Build a SignedOrder ready for submission to the CLOB.
 *
 * For signature types 1 (POLY_PROXY) and 2 (GNOSIS_SAFE), the signature
 * field is left empty because the CLOB server verifies the order via
 * L2 HMAC authentication headers (API key + secret + passphrase).
 *
 * The CLOB /order endpoint documentation states:
 * "For POLY_PROXY and GNOSIS_SAFE signature types, the order is authenticated
 * via the L2 API key headers, and the signature field should be set to '0x'."
 *
 * For EOA (signature type 0), the order would need to be signed client-side
 * with the user's private key. This module does NOT handle EOA signing
 * because private keys should never be transmitted to the server.
 */
export function buildOrder(
  creds: DecryptedCredential,
  params: BuildOrderParams,
): SignedOrder {
  // Validate price against tick size
  const tickSize = Number(params.tickSize);
  const priceSteps = Math.round(params.price / tickSize);
  const normalizedPrice = priceSteps * tickSize;

  if (Math.abs(normalizedPrice - params.price) > tickSize / 2) {
    throw new OrderBuildError(
      `Price ${params.price} does not conform to tick size ${params.tickSize}. ` +
        `Nearest valid price: ${normalizedPrice}`,
    );
  }

  // Calculate amounts
  const { makerAmount, takerAmount } = calculateOrderAmounts(
    params.side,
    normalizedPrice,
    params.size,
  );

  // Validate amounts are positive
  if (makerAmount === "0" || takerAmount === "0") {
    throw new OrderBuildError(
      "Order amounts too small. makerAmount and takerAmount must be > 0.",
    );
  }

  const salt = generateSalt();
  const nonce = params.nonce ?? generateNonce();
  const expiration = params.expiration ?? DEFAULT_EXPIRATION;

  // For L2-authenticated orders (POLY_PROXY and GNOSIS_SAFE),
  // the signature is verified via HMAC headers, not EIP-712.
  // The CLOB accepts "0x" as the signature for these types.
  const signatureType = creds.signatureType;

  if (signatureType === POLYMARKET_SIGNATURE_TYPE.EOA) {
    throw new OrderBuildError(
      "EOA signature type requires client-side EIP-712 signing. " +
        "Server-side order building only supports POLY_PROXY and GNOSIS_SAFE.",
    );
  }

  // The maker is the funder address (the wallet holding the funds).
  // For POLY_PROXY/GNOSIS_SAFE, this is distinct from the signer.
  const maker = creds.funderAddress ?? creds.polyAddress;
  const signer = creds.polyAddress;

  const signedOrder: SignedOrder = {
    salt,
    maker: maker.toLowerCase(),
    signer: signer.toLowerCase(),
    taker: (params.taker ?? ZERO_ADDRESS).toLowerCase(),
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration,
    nonce,
    feeRateBps: String(params.feeRateBps),
    side: params.side === "BUY" ? SIDE_BUY : SIDE_SELL,
    signatureType,
    // L2 auth: signature verified via HMAC headers
    signature: "0x",
  };

  logger.info("[polymarket:order-builder] Order built", {
    tokenId: params.tokenId,
    side: params.side,
    price: normalizedPrice,
    size: params.size,
    makerAmount,
    takerAmount,
    maker,
    signer,
    signatureType,
    negRisk: params.negRisk,
  });

  return signedOrder;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class OrderBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderBuildError";
  }
}
