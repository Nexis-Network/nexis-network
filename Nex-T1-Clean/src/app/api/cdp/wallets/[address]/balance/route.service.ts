import {
  fetchCdpBalances,
  type WalletBalanceResult,
} from "@/server/services/cdp/balance-service";

export async function getCdpWalletBalance(params: {
  address: string;
  platform: "evm" | "solana";
  chainId?: string;
}): Promise<WalletBalanceResult> {
  return fetchCdpBalances(params.address, {
    platform: params.platform,
    chainId: params.chainId,
  });
}

