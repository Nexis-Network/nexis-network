import { resolveCdpBalanceApiNetwork, resolveCdpNativeAsset } from "@/lib/cdp/cdp-chain-support";
import { logger } from "@/lib/logger";
import { getCdpClient } from "@/server/services/cdp/client";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";

import type { TokenBalance, WalletBalanceResult } from "./types";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type CdpClient = Awaited<ReturnType<typeof getCdpClient>>;

function toFiniteNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCdpEvmBalances(
  address: string,
  chainId: number,
  balances: Array<{
    token?: {
      contractAddress?: string;
      symbol?: string;
      name?: string;
    };
    amount?: {
      amount?: bigint;
      decimals?: number;
    };
  }>,
): WalletBalanceResult {
  const nativeAsset = resolveCdpNativeAsset(chainId);
  let native = {
    symbol: nativeAsset.symbol,
    balance: "0",
    usdValue: 0,
    decimals: nativeAsset.decimals,
  };
  const tokens: TokenBalance[] = [];

  for (const balance of balances) {
    const contractAddress = balance.token?.contractAddress ?? "native";
    const amount = String(balance.amount?.amount ?? "0");
    const decimals = Number(balance.amount?.decimals ?? nativeAsset.decimals);
    const isNative =
      contractAddress === "native" ||
      contractAddress === "" ||
      contractAddress === ZERO_ADDRESS;

    if (isNative) {
      native = {
        symbol: balance.token?.symbol ?? nativeAsset.symbol,
        balance: amount,
        usdValue: 0,
        decimals,
      };
      continue;
    }

    tokens.push({
      symbol: balance.token?.symbol ?? null,
      address: contractAddress,
      balance: amount,
      usdValue: 0,
      decimals,
      name: balance.token?.name ?? null,
    });
  }

  return {
    address,
    platform: "evm",
    chainId,
    native,
    tokens,
    totalUsdValue: 0,
  };
}

async function fetchFromMoralis(
  address: string,
  chainId: number,
): Promise<WalletBalanceResult> {
  const nativeAsset = resolveCdpNativeAsset(chainId);
  const summary = await fetchNexEvmWalletSummary(address, {
    includeTokens: true,
    includeNfts: false,
    includeTransactions: false,
    chainIds: [chainId],
    skipCache: false,
  });
  const nativeToken = summary.tokens.find((token) => token.contract === null);
  const normalizedTokens = summary.tokens
    .filter((token) => typeof token.contract === "string")
    .map((token) => ({
      symbol: token.symbol ?? null,
      address: token.contract!,
      balance: String(token.balance ?? "0"),
      usdValue: toFiniteNumber(token.valueUsd),
      decimals: Number(token.decimals ?? nativeAsset.decimals),
      name: token.name ?? null,
    }));

  return {
    address,
    platform: "evm",
    chainId,
    native: {
      symbol: nativeToken?.symbol ?? nativeAsset.symbol,
      balance: String(nativeToken?.balance ?? "0"),
      usdValue: toFiniteNumber(nativeToken?.valueUsd),
      decimals: nativeToken?.decimals ?? nativeAsset.decimals,
    },
    tokens: normalizedTokens,
    totalUsdValue: normalizedTokens.reduce(
      (sum, token) => sum + token.usdValue,
      0,
    ),
  };
}

export async function fetchEvmBalances(
  cdp: CdpClient,
  address: string,
  chainId?: number | string,
): Promise<WalletBalanceResult> {
  if (!EVM_ADDRESS_REGEX.test(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const nativeAsset = resolveCdpNativeAsset(chainId);
  const cdpBalanceNetwork = resolveCdpBalanceApiNetwork(nativeAsset.chainId);

  if (!cdpBalanceNetwork || !cdp) {
    return fetchFromMoralis(address, nativeAsset.chainId);
  }

  try {
    const result = await cdp.evm.listTokenBalances({
      address: address as `0x${string}`,
      network: cdpBalanceNetwork,
    });

    return mapCdpEvmBalances(
      address,
      nativeAsset.chainId,
      result.balances ?? [],
    );
  } catch (error) {
    logger.warn("cdp_balance_cdp_evm_fetch_failed", {
      address,
      chainId: nativeAsset.chainId,
      network: cdpBalanceNetwork,
      error: error instanceof Error ? error.message : String(error),
    });
    return fetchFromMoralis(address, nativeAsset.chainId);
  }
}
