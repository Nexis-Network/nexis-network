import { pickPreferredWallet } from "@/lib/launchpad/detail-helpers";
import { computeProRataClaim } from "@/server/agents/campaign";
import { signCampaignReceipt } from "@/server/agents/receipt-signing";

export type DistributionPosition = {
  id: string;
  investorUserId: string;
  sharesOwnedBaseUnits: string;
  claimableBaseUnits: string;
};

export type DistributionAllocation = {
  positionId: string;
  investorUserId: string;
  amountBaseUnits: string;
  claimableBaseUnits: string;
};

export type DistributionWalletRow = {
  user_id: string;
  namespace: string;
  address: string;
  verified_at: string | null;
};

export function computeDistributionAllocations(options: {
  positions: DistributionPosition[];
  investorPoolBaseUnits: string;
}): { totalSharesBaseUnits: string; allocations: DistributionAllocation[] } {
  const totalSharesBaseUnits = options.positions
    .reduce((acc, row) => acc + BigInt(row.sharesOwnedBaseUnits), 0n)
    .toString();

  const allocations: DistributionAllocation[] = [];
  for (const position of options.positions) {
    const amountBaseUnits = computeProRataClaim({
      investorSharesBaseUnits: position.sharesOwnedBaseUnits,
      totalSharesBaseUnits,
      distributableInvestorBaseUnits: options.investorPoolBaseUnits,
    });
    if (amountBaseUnits === "0") continue;
    allocations.push({
      positionId: position.id,
      investorUserId: position.investorUserId,
      amountBaseUnits,
      claimableBaseUnits: position.claimableBaseUnits,
    });
  }

  return { totalSharesBaseUnits, allocations };
}

export function buildPayoutReceiptRows(options: {
  orgId: string;
  campaignId: string;
  distributionId: string;
  chainFamily: "evm" | "solana";
  networkId: string;
  assetId: string | null;
  txHash: string | null;
  epochIndex: number;
  payoutTxHashes: string[];
  allocations: DistributionAllocation[];
  walletRows: DistributionWalletRow[];
  createdAt: string;
}): Array<Record<string, UntypedJson>> {
  const walletsByUser = groupWalletRowsByUser(options.walletRows);

  return options.allocations.map((allocation) => {
    const preferredWallet = pickPreferredWallet(
      (walletsByUser.get(allocation.investorUserId) ?? []).map((wallet) => ({
        namespace: wallet.namespace,
        address: wallet.address,
        verifiedAt: wallet.verified_at,
      })),
      options.chainFamily,
    );

    const recipientAddress = preferredWallet?.address ?? null;
    const payload = {
      campaignId: options.campaignId,
      distributionId: options.distributionId,
      recipientUserId: allocation.investorUserId,
      recipientAddress,
      networkId: options.networkId,
      assetId: options.assetId,
      amountBaseUnits: allocation.amountBaseUnits,
      txHash: options.txHash,
      createdAt: options.createdAt,
    };

    return {
      org_id: options.orgId,
      campaign_id: options.campaignId,
      distribution_id: options.distributionId,
      recipient_user_id: allocation.investorUserId,
      recipient_address: recipientAddress,
      network_id: options.networkId,
      asset_id: options.assetId,
      amount_base_units: allocation.amountBaseUnits,
      tx_hash: options.txHash,
      metadata: {
        epochIndex: options.epochIndex,
        payoutTxHashes: options.payoutTxHashes,
        recipientWalletNamespace: preferredWallet?.namespace ?? null,
      },
      receipt_signature: signCampaignReceipt(payload),
    };
  });
}

function groupWalletRowsByUser(walletRows: DistributionWalletRow[]): Map<string, DistributionWalletRow[]> {
  const map = new Map<string, DistributionWalletRow[]>();
  for (const row of walletRows) {
    const existing = map.get(row.user_id) ?? [];
    existing.push(row);
    map.set(row.user_id, existing);
  }
  return map;
}
