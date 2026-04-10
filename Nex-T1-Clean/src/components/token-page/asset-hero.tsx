import { Fragment, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type { AssetSnapshot } from "@/types/token-page";

import type { PriceSummary } from "./token-asset-page";
import { AssetImage } from "./asset-image";
import { getTokenLogoUrl } from "@/lib/assets/repository";

type AssetHeroProps = {
  snapshot: AssetSnapshot;
  priceSummary: PriceSummary | null;
  tabs: readonly { id: string; label: string; target: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  isRefreshing: boolean;
};

export function AssetHero({ snapshot, priceSummary, tabs, activeTab, onTabChange, isRefreshing }: AssetHeroProps) {
  const identitySegments =
    snapshot.kind === "token"
      ? [
        snapshot.symbol?.toUpperCase(),
        snapshot.categories[0],
        snapshot.networks[0]?.chain ?? (snapshot.networks.length > 1 ? "Multi-chain" : undefined),
      ].filter(Boolean)
      : [snapshot.symbol?.toUpperCase(), snapshot.blockchains[0], snapshot.blockchains[1]].filter(Boolean);

  const supportingPills: string[] = [];

  const networkLabel = snapshot.kind === "token"
    ? snapshot.networks[0]?.chain ?? "On-chain"
    : snapshot.blockchains[0] ?? "Multi-chain";
  const regionLabel = "US";

  const metaSegments = [...identitySegments, networkLabel].filter(Boolean) as string[];

  // Determine the repository URL for the logo
  let repoLogoUrl: string | undefined;
  if (snapshot.kind === "token") {
    const network = snapshot.networks[0];
    if (network && network.chain && network.contractAddress) {
      repoLogoUrl = getTokenLogoUrl(network.chain, network.contractAddress);
    } else if (network && network.chain) {
      // Fallback logic if needed, or leave undefined
    }
  } else {
    // NFT or other
    if (snapshot.blockchains && snapshot.blockchains[0]) {
      // repoLogoUrl = getBlockchainLogoUrl(snapshot.blockchains[0]);
    }
  }

  const primarySrc = repoLogoUrl || snapshot.imageUrl || "";
  const fallbackSrc = snapshot.imageUrl;

  return (
    <section className="flex w-full flex-col gap-4 text-foreground">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
              {primarySrc ? (
                <AssetImage
                  src={primarySrc}
                  fallbackSrc={fallbackSrc}
                  alt={snapshot.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                  priority
                  fallbackText={snapshot.symbol.slice(0, 1)}
                />
              ) : (
                <span className="text-[15.9px] font-light uppercase tracking-[0.16px] text-muted-foreground">
                  {snapshot.symbol.slice(0, 1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex min-w-[255px] flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-medium leading-[30px] tracking-[0.16px] text-foreground">
                {snapshot.name}
              </h1>
              <span className="text-sm font-light uppercase tracking-[0.16px] text-muted-foreground">{snapshot.symbol}</span>
              {snapshot.kind === "token" && snapshot.rank ? (
                <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16px] text-muted-foreground">
                  Rank #{snapshot.rank}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-light uppercase tracking-[0.16px] text-muted-foreground/60">
              {metaSegments.map((segment, idx) => (
                <Fragment key={`${segment}-${idx}`}>
                  <span>{segment}</span>
                  {idx < metaSegments.length - 1 ? (
                    <span className="text-[12px] leading-[16px] text-muted-foreground/60">·</span>
                  ) : null}
                </Fragment>
              ))}
              {metaSegments.length ? (
                <span className="text-[12px] leading-[16px] text-muted-foreground/60">·</span>
              ) : null}
              <span className="flex items-center gap-1">
                {regionLabel}
                <span className="h-[9px] w-[14px] rounded-[2px]" style={usaFlagStyle} />
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.14px] text-muted-foreground/60">
              {isRefreshing
                ? "Updating…"
                : `Updated ${priceSummary?.lastUpdated ? formatRelativeTime(priceSummary.lastUpdated) : "just now"}`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {supportingPills.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-border bg-muted/50 px-4 py-1 text-sm font-medium tracking-[0.16px] text-muted-foreground"
            >
              {pill}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "rounded-full border px-4 py-1 text-[11px] font-regular tracking-[0.16px] transition",
                  activeTab === tab.id
                    ? "border-sky-400/20 bg-sky-400/10 text-sky-400"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16px] text-muted-foreground/60">
            <Sparkles className="size-3 text-primary" />
            Live multi-feed
          </div>
        </div>
      </div>
    </section>
  );
}

const usaFlagStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg,#D80027 0%,#D80027 14.28%,#fff 14.28%,#fff 28.56%,#D80027 28.56%,#D80027 42.84%,#fff 42.84%,#fff 57.12%,#D80027 57.12%,#D80027 71.4%,#fff 71.4%,#fff 85.68%,#D80027 85.68%,#D80027 100%), linear-gradient(#2E52B2,#2E52B2)",
  backgroundSize: "100% 100%, 50% 60%",
  backgroundPosition: "0 0, 0 0",
  backgroundRepeat: "no-repeat",
  borderRadius: "2px",
};
