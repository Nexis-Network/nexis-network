import Link from "next/link";
import { ArrowUpRight, ChevronLeft, FileSignature, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LaunchpadCampaignDetail, LaunchpadCampaignReceipt } from "@/lib/launchpad/types";
import { cn } from "@/lib/utils";

import { formatDateTime, formatUsdBaseUnits, truncateAddress } from "@/components/launchpad/launch-detail/utils";

type LaunchReceiptsTimelineProps = {
  campaign: LaunchpadCampaignDetail;
  receipts: LaunchpadCampaignReceipt[];
  activeEpoch: number | null;
};

export function LaunchReceiptsTimeline({ campaign, receipts, activeEpoch }: LaunchReceiptsTimelineProps) {
  const distributionEpochById = new Map(campaign.distributions.map((distribution) => [distribution.id, distribution.epochIndex]));

  const receiptsWithEpoch = receipts
    .map((receipt) => {
      const metadataEpoch = receipt.metadata.epochIndex;
      const distributionEpoch = receipt.distributionId ? distributionEpochById.get(receipt.distributionId) : undefined;
      const epoch = typeof metadataEpoch === "number" ? metadataEpoch : distributionEpoch ?? null;
      return {
        ...receipt,
        resolvedEpoch: epoch,
      };
    })
    .filter((receipt) => activeEpoch === null || receipt.resolvedEpoch === activeEpoch)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const availableEpochs = Array.from(
    new Set(
      campaign.distributions
        .map((distribution) => distribution.epochIndex)
        .filter((epoch): epoch is number => Number.isFinite(epoch)),
    ),
  ).sort((left, right) => right - left);

  const signedCount = receiptsWithEpoch.filter((receipt) => receipt.signature.trim().length > 0).length;

  return (
    <div className="flex h-full min-h-full w-full justify-center overflow-y-auto bg-[#111214] px-4 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-[1240px] space-y-4 pb-10 sm:space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/launches/${campaign.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-[#2c2e35] bg-[#17181b] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-[#1c1e22]"
            >
              <ChevronLeft className="size-3.5" />
              Launch Detail
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Signed Receipt Timeline</p>
              <p className="truncate text-xs text-white/55">{campaign.agent.name}</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[#26272D] bg-[#141415] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#2d4b38] bg-transparent text-[#7CFFB2]">
              {signedCount} signed receipts
            </Badge>
            <Badge variant="outline" className="border-[#2d3f4b] bg-transparent text-[#8CD6FF]">
              Risk {campaign.riskScore}/100
            </Badge>
            <Badge variant="outline" className="border-[#3a3d44] bg-transparent text-white/70">
              {receiptsWithEpoch.length} visible receipts
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <EpochFilterChip campaignId={campaign.id} epoch={null} activeEpoch={activeEpoch} label="All Epochs" />
            {availableEpochs.map((epoch) => (
              <EpochFilterChip
                key={epoch}
                campaignId={campaign.id}
                epoch={epoch}
                activeEpoch={activeEpoch}
                label={`Epoch ${epoch}`}
              />
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[#26272D]">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[#17181b] text-[11px] uppercase tracking-[0.08em] text-white/55">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">Epoch</th>
                  <th className="px-4 py-2.5 font-medium">Recipient</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-right">Tx</th>
                  <th className="px-4 py-2.5 font-medium text-right">Signature</th>
                </tr>
              </thead>
              <tbody>
                {receiptsWithEpoch.length === 0 ? (
                  <tr className="border-t border-[#24262d]">
                    <td className="px-4 py-6 text-sm text-white/60" colSpan={6}>
                      No receipts available for the selected epoch.
                    </td>
                  </tr>
                ) : (
                  receiptsWithEpoch.map((receipt) => (
                    <tr key={receipt.id} className="border-t border-[#24262d] text-white/90">
                      <td className="px-4 py-3 text-xs text-white/70">{formatDateTime(receipt.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-[#34353C] bg-[#1B1D1F] text-[10px] text-white/85">
                          {receipt.resolvedEpoch !== null ? `Epoch ${receipt.resolvedEpoch}` : "Unassigned"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/80">
                        {receipt.recipientAddress ? truncateAddress(receipt.recipientAddress) : receipt.recipientUserId ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatUsdBaseUnits(receipt.amountBaseUnits)}</td>
                      <td className="px-4 py-3 text-right">
                        {receipt.txHash ? (
                          <ExternalTxLink chainRef={campaign.chainRef} txHash={receipt.txHash} />
                        ) : (
                          <span className="text-xs text-white/55">off-chain</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-white/80">
                        {receipt.signature ? `${receipt.signature.slice(0, 16)}…` : "missing"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {campaign.riskFlags.length > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#f6d67d]">
              <Shield className="size-3.5" />
              Risk flags: {campaign.riskFlags.join(", ")}
            </p>
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60">
              <FileSignature className="size-3.5" />
              No active risk flags on campaign snapshot.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function EpochFilterChip({
  campaignId,
  epoch,
  activeEpoch,
  label,
}: {
  campaignId: string;
  epoch: number | null;
  activeEpoch: number | null;
  label: string;
}) {
  const href = epoch === null ? `/launches/${campaignId}/receipts` : `/launches/${campaignId}/receipts?epoch=${epoch}`;
  const isActive = epoch === activeEpoch;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[12.5px]",
        isActive
          ? "border-[#34353C] bg-[#1B1D1F] text-white"
          : "border-[#26272D] bg-[#141415] text-[#ACADAE] hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

function ExternalTxLink({ chainRef, txHash }: { chainRef: string; txHash: string }) {
  const href = buildExplorerTxUrl(chainRef, txHash);
  if (!href) {
    return <span className="font-mono text-xs text-white/60">{truncateAddress(txHash, 5)}</span>;
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
