import Link from "next/link";
import { ArrowUpRight, ReceiptText } from "lucide-react";

import type { LaunchpadCampaignDetail, LaunchpadCampaignReceipt } from "@/lib/launchpad/types";

import {
  chainName,
  formatDateTime,
  formatNumber,
  formatUsdBaseUnits,
  truncateAddress,
} from "@/components/launchpad/launch-detail/utils";

type LaunchDistributionsTableProps = {
  campaign: LaunchpadCampaignDetail;
  receipts: LaunchpadCampaignReceipt[];
};

export function LaunchDistributionsTable({ campaign, receipts }: LaunchDistributionsTableProps) {
  const signedReceiptCount = receipts.filter((receipt) => receipt.signature.trim().length > 0).length;

  return (
    <article className="rounded-2xl border border-[#26272D] bg-[#141415]">
      <header className="flex items-center justify-between border-b border-[#26272D] px-5 py-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-[#8CD6FF]" />
          <h2 className="text-sm font-semibold text-white">Revenue Distribution Epochs</h2>
        </div>
        <span className="text-xs text-white/55">
          {campaign.distributions.length} epochs • {signedReceiptCount} signed receipts
        </span>
      </header>

      {campaign.distributions.length === 0 ? (
        <div className="px-5 py-8 text-sm text-white/65">No payout epochs have been recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-[#17181b] text-[11px] uppercase tracking-[0.08em] text-white/55">
              <tr>
                <th className="px-5 py-2.5 font-medium">Epoch</th>
                <th className="px-5 py-2.5 font-medium">Network</th>
                <th className="px-5 py-2.5 font-medium text-right">Gross</th>
                <th className="px-5 py-2.5 font-medium text-right">Investor Pool</th>
                <th className="px-5 py-2.5 font-medium text-right">Creator</th>
                <th className="px-5 py-2.5 font-medium text-right">Operator</th>
                <th className="px-5 py-2.5 font-medium text-right">Receipts</th>
                <th className="px-5 py-2.5 font-medium text-right">Coverage</th>
                <th className="px-5 py-2.5 font-medium text-right">Tx</th>
                <th className="px-5 py-2.5 font-medium text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaign.distributions.map((distribution) => {
                const distributionReceipts = receipts.filter((receipt) => {
                  if (receipt.distributionId && receipt.distributionId === distribution.id) {
                    return true;
                  }
                  const metadataEpoch = receipt.metadata.epochIndex;
                  return !receipt.distributionId && typeof metadataEpoch === "number" && metadataEpoch === distribution.epochIndex;
                });
                const receiptCount = distributionReceipts.length;
                const signedCount = distributionReceipts.filter((receipt) => receipt.signature.trim().length > 0).length;
                const coverage = receiptCount > 0 ? `${Math.round((signedCount / receiptCount) * 100)}%` : "N/A";

                return (
                  <tr key={distribution.id} className="border-t border-[#24262d] text-white/90">
                    <td className="px-5 py-3 font-mono">{formatNumber(String(distribution.epochIndex))}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm">{chainName(distribution.networkId)}</div>
                      <div className="text-xs text-white/55">{distribution.assetId ?? "native"}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{formatUsdBaseUnits(distribution.grossBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatUsdBaseUnits(distribution.investorBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatUsdBaseUnits(distribution.creatorBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatUsdBaseUnits(distribution.operatorBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      <Link href={`/launches/${campaign.id}/receipts?epoch=${distribution.epochIndex}`} className="text-[#8CD6FF] hover:text-[#B6E7FF]">
                        {receiptCount}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">{coverage}</td>
                    <td className="px-5 py-3 text-right">
                      {distribution.txHash ? (
                        <ExternalTxLink chainRef={campaign.chainRef} txHash={distribution.txHash} />
                      ) : (
                        <span className="text-xs text-white/45">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-white/65">{formatDateTime(distribution.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function ExternalTxLink({ chainRef, txHash }: { chainRef: string; txHash: string }) {
  const href = buildExplorerTxUrl(chainRef, txHash);
  if (!href) {
    return <span className="text-xs text-white/45">{truncateAddress(txHash, 5)}</span>;
  }
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-[#8CD6FF] hover:text-[#B6E7FF]"
    >
      {truncateAddress(txHash, 5)}
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

function buildExplorerTxUrl(chainRef: string, txHash: string): string | null {
  const chainMatch = /^eip155:(\d+)$/.exec(chainRef);
  if (chainMatch) {
    const chainId = Number(chainMatch[1]);
    const base =
      chainId === 1
        ? "https://etherscan.io/tx/"
        : chainId === 8453
          ? "https://basescan.org/tx/"
          : chainId === 10
            ? "https://optimistic.etherscan.io/tx/"
            : chainId === 42161
              ? "https://arbiscan.io/tx/"
              : null;
    return base ? `${base}${txHash}` : null;
  }
  if (chainRef.startsWith("solana:")) {
    return `https://solscan.io/tx/${txHash}`;
  }
  return null;
}
