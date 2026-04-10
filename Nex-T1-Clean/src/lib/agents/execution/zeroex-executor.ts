import pRetry, { AbortError } from "p-retry";
import { formatUnits, parseUnits } from "viem";

import { ZeroExApiError, fetchZeroExQuote, type ZeroExSwapQuoteResponse } from "@/server/services/vendors/zeroex-service";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { getNexAdminAccount } from "@/modules/wallets/nex/admin";
import { createNexSmartAccountClient } from "@/modules/wallets/nex/client-factory";
import { getViemChain } from "@/modules/wallets/nex/chains";
import type { ZeroExSwapInstruction, StrategyExecutionContext, ExecutedTrade } from "@/lib/agents/execution/types";

type TokenMetadata = {
  address?: `0x${string}`;
  decimals: number;
};

type ChainTokenMap = Record<string, TokenMetadata>;

const TOKEN_METADATA: Record<number, ChainTokenMap> = {
  1: {
    ETH: { decimals: 18 },
    USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    WBTC: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8 },
    MATIC: { address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", decimals: 18 },
    LINK: { address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18 },
    ARB: { address: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    AVAX: { address: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", decimals: 18 },
  },
  8453: {
    ETH: { decimals: 18 },
    USDC: { address: "0x833589fCD6eDb6E08f4c7C90b7Aaa2a5dA4A1328", decimals: 6 },
    USDT: { address: "0x5dB7144ED24730230c2c43dD4AaFaA09f22C470A", decimals: 6 },
    WBTC: { address: "0x7eC81b3de6efC4D4F5E7Bae23e7e01B26eF5b3C3", decimals: 8 },
    MATIC: { address: "0x5d28b4aa1c7a955b1922cd4453df45c2cb6793b3", decimals: 18 },
    LINK: { address: "0x66A2A913e447d6b4bf033B2F5C3176b4C0f81A1D", decimals: 18 },
    ARB: { address: "0x3082CC23568ea640225c2467653dB90e9250AaA0", decimals: 18 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    AVAX: { address: "0x61510B96F08aa109A39e9DA214F00F34f6a0cD91", decimals: 18 },
  },
  137: {
    MATIC: { decimals: 18 },
    USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    USDT: { address: "0xc2132D05D31c914A87C6611C10748AaCBdD4dAEc", decimals: 6 },
    WBTC: { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
    LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1FC0fD03FaBad39", decimals: 18 },
    ETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  },
  42161: {
    ETH: { decimals: 18 },
    USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    USDT: { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", decimals: 6 },
    WBTC: { address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", decimals: 6 },
    ARB: { address: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18 },
    LINK: { address: "0xf97f4df75117a78c1A5a0DBb814af92458539FB4", decimals: 18 },
  },
  10: {
    ETH: { decimals: 18 },
    USDC: { address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", decimals: 6 },
    USDT: { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    WBTC: { address: "0x68f180fcce6836688e9084f035309e29bf0a2095", decimals: 8 },
  },
};

function resolveToken(chainId: number, symbol: string): TokenMetadata {
  const entry = TOKEN_METADATA[chainId]?.[symbol.toUpperCase()];
  if (!entry) {
    throw new Error(`Unsupported token ${symbol} on chain ${chainId}`);
  }
  return entry;
}

function resolveZeroExTokenParam(chainId: number, symbol: string): string {
  const metadata = resolveToken(chainId, symbol);
  if (!metadata.address) return symbol.toUpperCase();
  return metadata.address;
}

async function fetchQuoteWithRetry(params: Parameters<typeof fetchZeroExQuote>[0]) {
  return pRetry(
    async () => {
      try {
        return await fetchZeroExQuote(params);
      } catch (error) {
        if (error instanceof ZeroExApiError) {
          if (error.isRateLimited || error.status >= 500) {
            throw error;
          }
          throw new AbortError(error);
        }
        throw error;
      }
    },
    {
      retries: 3,
      minTimeout: 500,
      maxTimeout: 2_000,
      factor: 2,
    },
  );
}

type TradeMetrics = {
  notionalUsd: number;
  pnlUsd: number;
  pnlPercent: number | null;
  isWin: boolean | null;
};

function computeTradeMetrics(
  instruction: ZeroExSwapInstruction,
  sellDecimals: number,
  buyDecimals: number,
  sellAmountBaseUnits: bigint,
  buyAmountBaseUnits: bigint,
  quotePrice: number,
  guaranteedPrice: number,
): TradeMetrics {
  const sellAmount = Number(formatUnits(sellAmountBaseUnits, sellDecimals));
  const buyAmount = Number(formatUnits(buyAmountBaseUnits, buyDecimals));

  let notionalUsd = 0;
  if (instruction.buyToken.toUpperCase().includes("USD")) {
    notionalUsd = buyAmount;
  } else if (instruction.sellToken.toUpperCase().includes("USD")) {
    notionalUsd = sellAmount;
  } else {
    notionalUsd = sellAmount * quotePrice;
  }

  const pnlUsd = (quotePrice - guaranteedPrice) * sellAmount;
  const pnlPercent = notionalUsd === 0 ? null : (pnlUsd / notionalUsd) * 100;
  const isWin = pnlUsd === 0 ? null : pnlUsd >= 0;

  return {
    notionalUsd,
    pnlUsd,
    pnlPercent,
    isWin,
  };
}

type SwapPreparation = {
  quote: ZeroExSwapQuoteResponse;
  taker: string;
  sellTokenMetadata: TokenMetadata;
  buyTokenMetadata: TokenMetadata;
  parsedAmount: bigint;
  sellAmountBaseUnits: bigint;
  buyAmountBaseUnits: bigint;
};

async function prepareSwap(instruction: ZeroExSwapInstruction, taker: string): Promise<SwapPreparation> {
  const sellTokenMetadata = resolveToken(instruction.chainId, instruction.sellToken);
  const buyTokenMetadata = resolveToken(instruction.chainId, instruction.buyToken);

  const parsedAmount = parseUnits(
    instruction.amount,
    instruction.amountMode === "BUY" ? buyTokenMetadata.decimals : sellTokenMetadata.decimals,
  );

  const quote = await fetchQuoteWithRetry({
    chainId: instruction.chainId,
    sellToken: resolveZeroExTokenParam(instruction.chainId, instruction.sellToken),
    buyToken: resolveZeroExTokenParam(instruction.chainId, instruction.buyToken),
    slippageBps: instruction.slippageBps,
    takerAddress: taker,
    ...(instruction.amountMode === "SELL"
      ? { sellAmount: parsedAmount.toString() }
      : { buyAmount: parsedAmount.toString() }),
  });

  const sellAmount = instruction.amountMode === "SELL" ? parsedAmount : BigInt(quote.sellAmount);
  const buyAmount = instruction.amountMode === "BUY" ? parsedAmount : BigInt(quote.buyAmount);

  return {
    quote,
    taker,
    sellTokenMetadata,
    buyTokenMetadata,
    parsedAmount,
    sellAmountBaseUnits: sellAmount,
    buyAmountBaseUnits: buyAmount,
  };
}

export async function quoteZeroExSwapInstruction(instruction: ZeroExSwapInstruction) {
  const adminAccount = await getNexAdminAccount(instruction.chainId);
  const taker = instruction.takerAddress ?? adminAccount?.address ?? null;
  if (!taker) {
    throw new Error("No taker address provided and admin account is not configured.");
  }
  const preparation = await prepareSwap(instruction, taker);

  const metrics = computeTradeMetrics(
    instruction,
    preparation.sellTokenMetadata.decimals,
    preparation.buyTokenMetadata.decimals,
    preparation.sellAmountBaseUnits,
    preparation.buyAmountBaseUnits,
    Number(preparation.quote.price),
    Number(preparation.quote.guaranteedPrice),
  );

  return {
    taker,
    quote: preparation.quote,
    sellAmount: Number(formatUnits(preparation.sellAmountBaseUnits, preparation.sellTokenMetadata.decimals)),
    buyAmount: Number(formatUnits(preparation.buyAmountBaseUnits, preparation.buyTokenMetadata.decimals)),
    metrics,
  };
}

export async function executeZeroExSwapInstruction(
  context: StrategyExecutionContext,
  instruction: ZeroExSwapInstruction,
): Promise<ExecutedTrade> {
  const supabase = createServiceRoleClient();
  const chainId = instruction.chainId;
  const chain = getViemChain(chainId);
  
  if (!chain) {
    throw new Error(`Unsupported execution chain ${chainId}`);
  }

  const adminWallet = await getNexAdminAccount(chainId);
  const taker = instruction.takerAddress ?? adminWallet?.address ?? null;
  
  if (!taker) {
    throw new Error("No taker address provided and admin account is not configured.");
  }
  if (!adminWallet) {
    throw new Error("Nex admin account is not available; cannot execute swap.");
  }
  
  const preparation = await prepareSwap(instruction, taker);

  // Create a SmartAccountClient from the Safe account
  // The SmartAccountClient has the sendTransaction method we need
  const smartAccountClient = createNexSmartAccountClient({
    account: adminWallet.account,
    chainId,
  });

  // Send the transaction via the smart account client
  // permissionless.js handles the UserOperation creation and bundling automatically
  const transactionHash = await smartAccountClient.sendTransaction({
    to: preparation.quote.to as `0x${string}`,
    data: preparation.quote.data as `0x${string}`,
    value: preparation.quote.value ? BigInt(preparation.quote.value) : 0n,
    // Gas parameters are usually handled by the bundler estimate, but we can pass overrides if needed
    // For ZeroEx swaps, we trust the quote's gas estimate or let the bundler re-estimate
  });

  // Wait for receipt if needed, or just return the hash (the orchestration layer usually tracks status)
  // For immediate confirmation we could use publicClient.waitForTransactionReceipt({ hash: transactionHash })

  const { notionalUsd, pnlUsd, pnlPercent, isWin } = computeTradeMetrics(
    instruction,
    preparation.sellTokenMetadata.decimals,
    preparation.buyTokenMetadata.decimals,
    preparation.sellAmountBaseUnits,
    preparation.buyAmountBaseUnits,
    Number(preparation.quote.price),
    Number(preparation.quote.guaranteedPrice),
  );

  const executedAt = new Date();

  const { error: insertError } = await supabase
    .from("agent_trade")
    .insert({
      org_id: context.orgId,
      agent_id: context.agentId,
      agent_version_id: context.agentVersionId,
      strategy_snapshot_id: context.strategySnapshotId,
      executed_at: executedAt.toISOString(),
    side: instruction.amountMode === "SELL" ? "sell" : "buy",
      base_asset: instruction.sellToken,
      quote_asset: instruction.buyToken,
      amount: Number(formatUnits(preparation.sellAmountBaseUnits, preparation.sellTokenMetadata.decimals)),
      notional_usd: notionalUsd,
      pnl_usd: pnlUsd,
      pnl_percent: pnlPercent,
      fees_usd: 0,
      is_win: isWin,
    tx_hash: transactionHash,
      metadata: {
        quote: preparation.quote,
        instruction,
        taker,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  // Not checking slippage here for now (handled by backend triggers or we can re-add if needed)

  return {
    transactionHash,
    amount: Number(formatUnits(preparation.sellAmountBaseUnits, preparation.sellTokenMetadata.decimals)),
    notionalUsd,
    pnlUsd,
    pnlPercent,
    wasWin: isWin,
    executedAt,
  };
}
