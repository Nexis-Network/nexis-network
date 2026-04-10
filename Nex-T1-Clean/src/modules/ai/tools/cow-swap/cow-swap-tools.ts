/**
 * CoW Swap AI Tools
 *
 * Domain: AI Tools → DeFi
 * Responsibility: Expose CoW Protocol swap operations as AI SDK tools.
 *
 * Tools:
 * - cow_swap_quote   — Get a swap quote (read-only)
 * - cow_swap_execute — Execute a swap via Safe PreSign (HITL-approved)
 * - cow_swap_status  — Check order status (read-only)
 *
 * Safe Integration:
 * For Safe smart wallets, orders use the "presign" signing scheme.
 * After submitting to CoW API, the Safe calls setPreSignature(orderUid, true)
 * on the settlement contract (0x9008D19f58AAbD9eD0D60971565AA8510560ab41).
 *
 * @see https://docs.cow.fi/cow-protocol/reference/apis/orderbook
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  integerProp,
  enumProp,
} from "../create-tool";

import {
  getCowSwapQuote,
  submitCowSwapOrder,
  getCowSwapOrderStatus,
} from "@/server/services/cow/cow-swap-client";

import {
  type CowChainId,
  isCowSupportedChain,
  buildPreSignCalldata,
  COW_SETTLEMENT_CONTRACT,
  COW_VAULT_RELAYER,
  COW_SUPPORTED_CHAIN_IDS,
  defaultValidTo,
} from "@/server/services/cow/cow-swap-types";

// ─── Schema fragments ───────────────────────────────────────────
const chainIdSchema = integerProp(
  `EVM chain ID. Supported: ${COW_SUPPORTED_CHAIN_IDS.join(", ")} (Mainnet, Gnosis, Arbitrum, Base, Sepolia)`,
  { minimum: 1 },
);

const addressSchema = stringProp("ERC-20 token contract address (0x...)", {
  minLength: 42,
});

const amountSchema = stringProp(
  "Token amount in smallest unit (wei/base units). Use BigInt-compatible string.",
  { minLength: 1 },
);

const orderKindSchema = enumProp(
  "Order kind: 'sell' = sell exact amount, 'buy' = buy exact amount",
  ["sell", "buy"],
  "sell",
);

// ─── cow_swap_quote ─────────────────────────────────────────────
export const cowSwapQuoteTool = createTool<
  {
    chainId: number;
    sellToken: string;
    buyToken: string;
    amount: string;
    kind?: "sell" | "buy";
    from: string;
    receiver?: string;
  },
  {
    chainId: number;
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    feeAmount: string;
    validTo: number;
    expiresAt: string;
    vaultRelayer: string;
    note: string;
  }
>({
  description:
    "Get a CoW Swap quote for a token pair. Returns expected amounts, fees, and expiry. " +
    "Supports Ethereum Mainnet (1), Gnosis (100), Arbitrum (42161), Base (8453), Sepolia (11155111). " +
    "The user must approve the sellToken to the vaultRelayer before executing.",
  schema: createToolSchema(
    {
      chainId: chainIdSchema,
      sellToken: addressSchema,
      buyToken: addressSchema,
      amount: amountSchema,
      kind: orderKindSchema,
      from: stringProp("Wallet address placing the order (0x...)", {
        minLength: 42,
      }),
      receiver: stringProp(
        "Optional: receiver address for bought tokens (0x...). Defaults to `from`.",
      ),
    },
    ["chainId", "sellToken", "buyToken", "amount", "from"],
  ),
  execute: async ({ chainId, sellToken, buyToken, amount, kind = "sell", from, receiver }) => {
    if (!isCowSupportedChain(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported by CoW Protocol. Supported: ${COW_SUPPORTED_CHAIN_IDS.join(", ")}`,
      );
    }

    const quoteResponse = await getCowSwapQuote(chainId as CowChainId, {
      sellToken,
      buyToken,
      sellAmountBeforeFee: kind === "sell" ? amount : undefined,
      buyAmountAfterFee: kind === "buy" ? amount : undefined,
      kind,
      from,
      receiver,
      partiallyFillable: false,
      signingScheme: "presign",
    });

    return {
      chainId,
      sellToken: quoteResponse.quote.sellToken,
      buyToken: quoteResponse.quote.buyToken,
      sellAmount: quoteResponse.quote.sellAmount,
      buyAmount: quoteResponse.quote.buyAmount,
      feeAmount: quoteResponse.quote.feeAmount,
      validTo: quoteResponse.quote.validTo,
      expiresAt: quoteResponse.expiration,
      vaultRelayer: COW_VAULT_RELAYER,
      note:
        "To execute this swap, the sellToken must be approved to the vaultRelayer. " +
        "Then call cow_swap_execute with the same parameters. " +
        "For Safe wallets, execution uses the PreSign on-chain method.",
    };
  },
});

// ─── cow_swap_execute ───────────────────────────────────────────
export const cowSwapExecuteTool = createTool<
  {
    chainId: number;
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    feeAmount: string;
    from: string;
    receiver?: string;
    kind?: "sell" | "buy";
    validTo?: number;
  },
  {
    orderUid: string;
    chainId: number;
    status: string;
    preSignCalldata: string;
    settlementContract: string;
    instruction: string;
  }
>({
  description:
    "Execute a CoW Swap order using the PreSign method (Safe-compatible). " +
    "IMPORTANT: Call cow_swap_quote first to get the amounts. " +
    "This submits the order to CoW API and returns the PreSign calldata. " +
    "For Safe wallets, use wallet_send_transaction to call setPreSignature on the settlement contract. " +
    "REQUIRES USER APPROVAL before execution.",
  schema: createToolSchema(
    {
      chainId: chainIdSchema,
      sellToken: addressSchema,
      buyToken: addressSchema,
      sellAmount: amountSchema,
      buyAmount: amountSchema,
      feeAmount: stringProp("Fee amount from the quote response"),
      from: stringProp("Wallet address placing the order (0x...)", {
        minLength: 42,
      }),
      receiver: stringProp("Optional: receiver address (0x...)"),
      kind: orderKindSchema,
      validTo: integerProp(
        "Order expiry as Unix timestamp. Defaults to 30 minutes from now.",
      ),
    },
    ["chainId", "sellToken", "buyToken", "sellAmount", "buyAmount", "feeAmount", "from"],
  ),
  execute: async ({
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    feeAmount,
    from,
    receiver,
    kind = "sell",
    validTo,
  }) => {
    if (!isCowSupportedChain(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported by CoW Protocol. Supported: ${COW_SUPPORTED_CHAIN_IDS.join(", ")}`,
      );
    }

    const orderValidTo = validTo ?? defaultValidTo();

    // Submit order with presign signing scheme.
    // For presign, the "signature" is just the owner/from address.
    const orderUid = await submitCowSwapOrder(chainId as CowChainId, {
      sellToken,
      buyToken,
      receiver: receiver ?? null,
      sellAmount,
      buyAmount,
      validTo: orderValidTo,
      appData: "0x0000000000000000000000000000000000000000000000000000000000000000",
      feeAmount,
      kind,
      partiallyFillable: false,
      signingScheme: "presign",
      signature: from, // For presign, signature = owner address
      from,
    });

    // Build the calldata for setPreSignature(orderUid, true) on the settlement contract
    const preSignCalldata = buildPreSignCalldata(orderUid, true);

    return {
      orderUid,
      chainId,
      status: "presignaturePending",
      preSignCalldata,
      settlementContract: COW_SETTLEMENT_CONTRACT,
      instruction:
        `Order submitted to CoW Protocol (UID: ${orderUid}). ` +
        `To activate it, call setPreSignature on ${COW_SETTLEMENT_CONTRACT} with the preSignCalldata. ` +
        `Use wallet_send_transaction with: to=${COW_SETTLEMENT_CONTRACT}, data=${preSignCalldata}, value=0. ` +
        `After the on-chain presign TX confirms, CoW solvers will fill the order.`,
    };
  },
});

// ─── cow_swap_status ────────────────────────────────────────────
export const cowSwapStatusTool = createTool<
  {
    chainId: number;
    orderUid: string;
  },
  {
    orderUid: string;
    chainId: number;
    status: string;
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    executedSellAmount?: string;
    executedBuyAmount?: string;
    creationDate: string;
    owner: string;
  }
>({
  description:
    "Check the status of a CoW Swap order by its UID. " +
    "Returns fill status, executed amounts, and order details.",
  schema: createToolSchema(
    {
      chainId: chainIdSchema,
      orderUid: stringProp("The order UID returned by cow_swap_execute", {
        minLength: 10,
      }),
    },
    ["chainId", "orderUid"],
  ),
  execute: async ({ chainId, orderUid }) => {
    if (!isCowSupportedChain(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported by CoW Protocol. Supported: ${COW_SUPPORTED_CHAIN_IDS.join(", ")}`,
      );
    }

    const order = await getCowSwapOrderStatus(chainId as CowChainId, orderUid);

    return {
      orderUid: order.uid,
      chainId,
      status: order.status,
      sellToken: order.sellToken,
      buyToken: order.buyToken,
      sellAmount: order.sellAmount,
      buyAmount: order.buyAmount,
      executedSellAmount: order.executedSellAmount,
      executedBuyAmount: order.executedBuyAmount,
      creationDate: order.creationDate,
      owner: order.owner,
    };
  },
});
