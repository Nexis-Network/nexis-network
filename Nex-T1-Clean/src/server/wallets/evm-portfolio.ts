import type { WalletAssetSummary } from "@/lib/user/profile";

// Returns up to `max` EVM token summaries for display in the Wallets table
export async function getEvmTopAssets(ownerAddress: string, _max: number = 3): Promise<WalletAssetSummary[]> {
  void ownerAddress;
  return [];
}

