import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { LaunchpadCampaignDetail } from "@/lib/launchpad/types";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";

import {
  formatNumber,
  formatShortAge,
  formatUsdBaseUnits,
  truncateAddress,
} from "@/components/launchpad/launch-detail/utils";

type LaunchParticipantsTableProps = {
  campaign: LaunchpadCampaignDetail;
};

export function LaunchParticipantsTable({ campaign }: LaunchParticipantsTableProps) {
  return (
    <article className="rounded-2xl border border-[#26272D] bg-[#141415]">
      <header className="flex items-center justify-between border-b border-[#26272D] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Participating Wallets</h2>
          <p className="text-xs text-white/60">
            {formatNumber(String(campaign.totals.participantCount))} unique participants across {formatNumber(String(campaign.totals.contributionCount))} contributions
          </p>
        </div>
      </header>

      {campaign.participants.length === 0 ? (
        <div className="px-5 py-8 text-sm text-white/65">No contributors yet. Contributions will appear here once funding starts.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-[#17181b] text-[11px] uppercase tracking-[0.08em] text-white/55">
              <tr>
                <th className="px-5 py-2.5 font-medium">Wallet / User</th>
                <th className="px-5 py-2.5 font-medium text-right">Contributed</th>
                <th className="px-5 py-2.5 font-medium text-right">Shares</th>
                <th className="px-5 py-2.5 font-medium text-right">Contributions</th>
                <th className="px-5 py-2.5 font-medium text-right">Last Tx</th>
                <th className="px-5 py-2.5 font-medium text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {campaign.participants.map((participant) => {
                const txUrl = participant.lastTxHash ? buildExplorerTxUrl(campaign.chainRef, participant.lastTxHash) : null;
                return (
                  <tr key={participant.userId} className="border-t border-[#24262d] text-white/90">
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveAvatarImageSrc(participant.avatarUrl, participant.userId)}
                          alt={participant.displayName}
                          className="size-8 rounded-full border border-white/10 object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{participant.displayName}</p>
                          <p className="truncate font-mono text-xs text-white/55">
                            {truncateAddress(participant.walletAddress)}
                            {participant.walletNamespace ? ` (${participant.walletNamespace})` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{formatUsdBaseUnits(participant.totalContributedBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatNumber(participant.totalSharesBaseUnits)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatNumber(String(participant.contributionCount))}</td>
                    <td className="px-5 py-3 text-right">
                      {participant.lastTxHash && txUrl ? (
                        <Link
                          href={txUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-[#8CD6FF] hover:text-[#B6E7FF]"
                        >
                          {truncateAddress(participant.lastTxHash, 5)}
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-white/50">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-white/65">{formatShortAge(participant.latestContributionAt)}</td>
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
