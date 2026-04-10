import Link from "next/link";
import { AlertTriangle, ArrowUpRight, FileCheck2, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LaunchpadCampaignDetail, LaunchpadCampaignReceipt } from "@/lib/launchpad/types";

import { formatDateTime, formatUsdBaseUnits, truncateAddress } from "@/components/launchpad/launch-detail/utils";

type LaunchInvestorProtectionPanelProps = {
  campaign: LaunchpadCampaignDetail;
  receipts: LaunchpadCampaignReceipt[];
};

export function LaunchInvestorProtectionPanel({ campaign, receipts }: LaunchInvestorProtectionPanelProps) {
  const compliance = campaign.compliancePolicy as {
    requireVerifiedWallet?: boolean;
    blockSanctionedJurisdictions?: boolean;
    requireAcknowledgedRisk?: boolean;
  };

  const signedCount = receipts.filter((receipt) => receipt.signature.trim().length > 0).length;
  const epochCount = new Set(
    receipts
      .map((receipt) => {
        const metadataEpoch = receipt.metadata.epochIndex;
        return typeof metadataEpoch === "number" ? metadataEpoch : null;
      })
      .filter((epoch): epoch is number => epoch !== null),
  ).size;

  const totalReceiptVolume = receipts
    .reduce((acc, receipt) => {
      if (!/^\d+$/.test(receipt.amountBaseUnits)) return acc;
      return acc + BigInt(receipt.amountBaseUnits);
    }, 0n)
    .toString();

  const riskBand =
    campaign.riskScore >= 70
      ? { label: "High", tone: "text-[#ff8f8f] border-[#4a2b2d]" }
      : campaign.riskScore >= 40
        ? { label: "Medium", tone: "text-[#f6d67d] border-[#4a4231]" }
        : { label: "Low", tone: "text-[#7CFFB2] border-[#2d4b38]" };

  return (
    <section className="rounded-2xl border border-[#26272D] bg-[#141415] p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-white">
            <Shield className="size-4 text-[#8CD6FF]" />
            <h2 className="text-sm font-semibold">Investor Protection</h2>
          </div>
          <p className="text-xs text-white/60">Risk scoring, compliance gates, and signed payout receipt evidence.</p>
        </div>

        <Badge variant="outline" className={`bg-transparent ${riskBand.tone}`}>
          Risk {campaign.riskScore}/100 • {riskBand.label}
        </Badge>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Signed Receipts" value={`${signedCount}`} />
        <Stat label="Receipt Volume" value={formatUsdBaseUnits(totalReceiptVolume)} />
        <Stat label="Epoch Coverage" value={`${epochCount}`} />
        <Stat label="Active Flags" value={`${campaign.riskFlags.length}`} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <PolicyBadge label="Verified Wallet" enabled={Boolean(compliance.requireVerifiedWallet)} />
        <PolicyBadge label="Sanctions Screen" enabled={Boolean(compliance.blockSanctionedJurisdictions)} />
        <PolicyBadge label="Risk Acknowledgement" enabled={Boolean(compliance.requireAcknowledgedRisk)} />
      </div>

      <div className="mt-4 rounded-lg border border-[#2a2c33] bg-[#17181b] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
            <FileCheck2 className="size-3.5 text-[#8CD6FF]" />
            Latest signed receipts
          </p>
          <Link
            href={`/launches/${campaign.id}/receipts`}
            className="inline-flex items-center gap-1 text-xs text-[#8CD6FF] hover:text-[#B6E7FF]"
          >
            Open timeline
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {receipts.length === 0 ? (
          <p className="text-xs text-white/60">No signed payout receipts are available yet.</p>
        ) : (
          <div className="space-y-2">
            {receipts.slice(0, 4).map((receipt) => (
              <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#2c2f36] px-2.5 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-mono text-white">{formatUsdBaseUnits(receipt.amountBaseUnits)}</p>
                  <p className="truncate text-white/55">{formatDateTime(receipt.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <span className="font-mono">sig {receipt.signature.slice(0, 10)}…</span>
                  {receipt.txHash ? (
                    <ExternalTxLink chainRef={campaign.chainRef} txHash={receipt.txHash} />
                  ) : (
                    <span>off-chain</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {campaign.riskFlags.length > 0 ? (
          <p className="mt-3 inline-flex items-start gap-1 text-[11px] text-[#f6d67d]">
            <AlertTriangle className="mt-0.5 size-3.5" />
            Active risk flags: {campaign.riskFlags.join(", ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#26272D] bg-[#17181b] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">{label}</p>
      <p className="mt-1 font-mono text-sm text-white">{value}</p>
    </article>
  );
}

function PolicyBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="inline-flex items-center justify-between gap-2 rounded-md border border-[#2b2d34] bg-[#17181b] px-3 py-2 text-xs">
      <span className="text-white/75">{label}</span>
      <Badge
        variant="outline"
        className={enabled ? "border-[#2d4b38] text-[#7CFFB2]" : "border-[#3a3d44] text-white/55"}
      >
        {enabled ? "Enabled" : "Off"}
      </Badge>
    </div>
  );
}

function ExternalTxLink({ chainRef, txHash }: { chainRef: string; txHash: string }) {
  const href = buildExplorerTxUrl(chainRef, txHash);
  if (!href) {
    return <span className="font-mono text-white/60">{truncateAddress(txHash, 5)}</span>;
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[#8CD6FF] hover:text-[#B6E7FF]"
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
