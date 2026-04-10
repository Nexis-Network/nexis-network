"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import type { LaunchesViewMode } from "@/lib/launchpad/filters";
import type { LaunchpadCampaignItem } from "@/lib/launchpad/types";
import { cn } from "@/lib/utils";

type LaunchesGridProps = {
  items: LaunchpadCampaignItem[];
  viewMode: LaunchesViewMode;
};

type ChainDisplay = {
  label: string;
  icon: string;
  nativeSymbol: string;
};

type AssetDisplay = {
  label: string;
  icon: string;
};

const DESKTOP_GRID_TEMPLATE =
  "grid-cols-[32px_minmax(180px,2.2fr)_minmax(96px,1fr)_minmax(108px,1.1fr)_minmax(72px,0.8fr)_minmax(72px,0.8fr)_minmax(64px,0.7fr)_minmax(72px,0.8fr)_minmax(72px,0.8fr)_minmax(72px,0.8fr)_80px]";

const CHAIN_DISPLAY_BY_REF: Record<string, ChainDisplay> = {
  "eip155:8453": { label: "Base", icon: "/icons/chain-icons/base.svg", nativeSymbol: "ETH" },
  "eip155:1": { label: "Ethereum", icon: LIQUID_GLASS_LOGOS.ethereum, nativeSymbol: "ETH" },
  "eip155:10": { label: "Optimism", icon: "/icons/chain-icons/optimism.svg", nativeSymbol: "ETH" },
  "eip155:42161": { label: "Arbitrum", icon: "/icons/chain-icons/arbitrum.svg", nativeSymbol: "ETH" },
  "solana:101": { label: "Solana", icon: LIQUID_GLASS_LOGOS.solana, nativeSymbol: "SOL" },
};

export function LaunchesGrid({ items, viewMode }: LaunchesGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = (searchParams.get("view") ?? "trending").toLowerCase();

  const favoriteIds = parseFavoriteIds(searchParams.get("favorites"));
  const favoriteSet = new Set(favoriteIds);

  const visibleItems =
    activeView === "watchlist"
      ? items.filter((item) => favoriteSet.has(item.id) || Boolean(item.position))
      : items;

  const toggleFavorite = (campaignId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = new Set(parseFavoriteIds(params.get("favorites")));

    if (next.has(campaignId)) {
      next.delete(campaignId);
    } else {
      next.add(campaignId);
    }

    if (next.size === 0) {
      params.delete("favorites");
    } else {
      params.set("favorites", Array.from(next).join(","));
    }

    const query = params.toString();
    router.push(query ? `/launches?${query}` : "/launches");
  };

  if (visibleItems.length === 0) {
    return (
      <section className="flex min-h-full flex-1 flex-col items-center justify-center rounded-none bg-[#141415] px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-white">No launches found</h2>
        <p className="mt-2 text-sm text-white/60">
          No campaigns matched your filters. Adjust category, chain, or search query.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={cn("hidden min-h-0 flex-1 xl:flex xl:flex-col", viewMode === "cards" && "xl:hidden")}>
        <div className="border-b border-[#26272D] bg-[#141415]">
          <div className={cn("grid w-full items-center gap-3 px-0 py-[11px]", DESKTOP_GRID_TEMPLATE)}>
            <div />
            <div className="font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Token</div>
            <div className="font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Chain</div>
            <div className="font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Asset</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Raised</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Progress</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Risk</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Status</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Target</div>
            <div className="text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Updated</div>
            <div className="px-2 text-right font-mono text-[12px] uppercase leading-[18px] text-[#ACADAE]">Action</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="w-full">
            {visibleItems.map((item) => {
              const progressPct = Math.max(0, Math.min(100, item.progressBps / 100));
              const progressLabel = `+${progressPct.toFixed(1)}%`;
              const progressTone = progressToneClass(progressPct);
              const riskTone = riskToneClass(item.riskScore);
              const statusTone = statusToneClass(item.status);
              const updatedLabel = formatDistanceToNowStrict(new Date(item.updatedAt), { addSuffix: true }).replace(
                " ago",
                "",
              );
              const chain = resolveChainDisplay(item.chainRef);
              const asset = resolveAssetDisplay(item.acceptedAssets[0] ?? "native", item.chainRef);
              const isFavorited = favoriteSet.has(item.id);

              return (
                <div
                  key={item.id}
                  className={cn("grid w-full items-center gap-3 border-b border-[#26272D]", DESKTOP_GRID_TEMPLATE)}
                >
                  <div className="flex h-12 items-center justify-center pl-2">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex size-4 items-center justify-center",
                        isFavorited ? "text-[#B9F106]" : "text-white/90",
                      )}
                      aria-label={`Favorite ${item.agent.name}`}
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Star className="size-3.5" fill={isFavorited ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="flex h-[47px] min-w-0 items-center rounded-[4px] bg-[#141415] pl-2 pr-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <AvatarBubble name={item.agent.name} src={item.agent.avatarUrl} size="sm" />
                      <div className="flex min-w-0 items-center gap-1.5 text-[13.5px] leading-[21px]">
                        <Link href={`/launches/${item.id}`} className="truncate text-white transition-colors hover:text-white/85">
                          {item.agent.name}
                        </Link>
                        <span className="truncate text-[#ACADAE]">{tokenSymbol(item.agent.slug)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[13.3px] leading-[21px] text-white">
                    <Image
                      src={chain.icon}
                      alt={`${chain.label} logo`}
                      width={15}
                      height={15}
                      className="size-[15px] rounded-full object-cover"
                    />
                    <span className="truncate">{chain.label}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[13.3px] leading-[21px] text-[#ACADAE]">
                    <Image
                      src={asset.icon}
                      alt={`${asset.label} logo`}
                      width={15}
                      height={15}
                      className="size-[15px] rounded-full object-cover"
                    />
                    <span className="truncate">{asset.label}</span>
                    {item.acceptedAssets.length > 1 ? <span className="shrink-0 text-white/50">+{item.acceptedAssets.length - 1}</span> : null}
                  </div>

                  <div className="flex justify-end text-right font-mono text-[14px] leading-[21px] text-white">
                    {formatCompactCurrency(item.raisedBaseUnits)}
                  </div>
                  <div className={cn("flex justify-end text-right font-mono text-[14px] leading-[21px]", progressTone)}>
                    {progressLabel}
                  </div>
                  <div className={cn("flex justify-end text-right font-mono text-[14px] leading-[21px]", riskTone)}>
                    R-{item.riskScore}
                  </div>
                  <div className={cn("flex justify-end text-right font-mono text-[14px] leading-[21px]", statusTone)}>
                    {statusLabel(item.status)}
                  </div>
                  <div className="flex justify-end text-right font-mono text-[14px] leading-[21px] text-white">
                    {formatCompactCurrency(item.targetBaseUnits)}
                  </div>
                  <div className="flex justify-end text-right font-mono text-[14px] leading-[21px] text-white whitespace-nowrap">
                    {updatedLabel}
                  </div>
                  <div className="flex justify-end px-2">
                    <Link
                      href={`/launches/${item.id}`}
                      className="inline-flex h-8 w-20 items-center justify-center rounded-md border border-[#34353C] bg-[#1B1D1F] text-xs font-medium text-white transition-colors hover:bg-[#262830]"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-3 p-4",
          viewMode === "rows" ? "xl:hidden" : "xl:grid xl:grid-cols-2 xl:gap-4 2xl:grid-cols-3",
        )}
      >
        {visibleItems.map((item, index) => {
          const progressPct = Math.max(0, Math.min(100, item.progressBps / 100));
          const progressLabel = `${progressPct.toFixed(1)}%`;
          const updatedLabel = formatDistanceToNowStrict(new Date(item.updatedAt), { addSuffix: true });
          const chain = resolveChainDisplay(item.chainRef);
          const asset = resolveAssetDisplay(item.acceptedAssets[0] ?? "native", item.chainRef);
          const isFavorited = favoriteSet.has(item.id);

          return (
            <article key={item.id} className="rounded-xl border border-[#26272D] bg-[#141415] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={cn("text-xs", isFavorited ? "text-[#B9F106]" : "text-[#ACADAE]")}
                    aria-label={`Favorite ${item.agent.name}`}
                    onClick={() => toggleFavorite(item.id)}
                  >
                    {index + 1}
                  </button>
                  <AvatarBubble name={item.agent.name} src={item.agent.avatarUrl} size="md" />
                  <div>
                    <Link href={`/launches/${item.id}`} className="text-sm font-medium text-white">
                      {item.agent.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#ACADAE]">
                      <Image
                        src={chain.icon}
                        alt={`${chain.label} logo`}
                        width={14}
                        height={14}
                        className="size-3.5 rounded-full object-cover"
                      />
                      <span>{chain.label}</span>
                      <span>•</span>
                      <Image
                        src={asset.icon}
                        alt={`${asset.label} logo`}
                        width={14}
                        height={14}
                        className="size-3.5 rounded-full object-cover"
                      />
                      <span>{asset.label}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-[#26272D] bg-[#1B1D1F] text-[10px] uppercase",
                    item.status === "active" ? "text-[#47BB64]" : "text-[#ACADAE]",
                  )}
                >
                  {statusLabel(item.status)}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-[#ACADAE]">
                <div>
                  <p>Raised</p>
                  <p className="font-mono text-[14px] text-white">{formatCompactCurrency(item.raisedBaseUnits)}</p>
                </div>
                <div>
                  <p>Target</p>
                  <p className="font-mono text-[14px] text-white">{formatCompactCurrency(item.targetBaseUnits)}</p>
                </div>
                <div>
                  <p>Progress</p>
                  <p className={cn("font-mono text-[14px]", progressToneClass(progressPct))}>+{progressLabel}</p>
                </div>
                <div>
                  <p>Risk</p>
                  <p className={cn("font-mono text-[14px]", riskToneClass(item.riskScore))}>R-{item.riskScore}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[#ACADAE]">
                <span>{updatedLabel}</span>
                <Link href={`/launches/${item.id}`} className="rounded border border-[#34353C] bg-[#1B1D1F] px-2 py-0.5 text-[11px] text-white">
                  Open
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function AvatarBubble({ name, src, size }: { name: string; src: string | null; size: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-8" : "size-9";
  const fallbackImage = createPlaceholderTokenImage(name);

  return (
    <div className={cn("relative overflow-hidden rounded-full border border-white/10 bg-[#17181a]", sizeClass)}>
      <Image
        src={src ?? fallbackImage}
        alt={name}
        fill
        unoptimized
        sizes={size === "sm" ? "32px" : "36px"}
        className="rounded-full object-cover"
      />
    </div>
  );
}

function parseFavoriteIds(value: string | null): string[] {
  if (!value) return [];
  const ids = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(ids));
}

function resolveChainDisplay(chainRef: string): ChainDisplay {
  return CHAIN_DISPLAY_BY_REF[chainRef] ?? {
    label: chainRef,
    icon: "/icons/chain-icons/token.svg",
    nativeSymbol: "NATIVE",
  };
}

function resolveAssetDisplay(assetId: string, chainRef: string): AssetDisplay {
  const normalized = assetId.toLowerCase();
  const chain = resolveChainDisplay(chainRef);

  if (normalized === "native") {
    return {
      label: chain.nativeSymbol,
      icon: chain.icon,
    };
  }

  if (normalized.includes("usdc")) return { label: "USDC", icon: LIQUID_GLASS_LOGOS.usdc };
  if (normalized.includes("usdt")) return { label: "USDT", icon: LIQUID_GLASS_LOGOS.tether };
  if (normalized.includes("dai")) return { label: "DAI", icon: "/icons/chain-icons/dai.svg" };
  if (normalized.includes("weth")) return { label: "WETH", icon: LIQUID_GLASS_LOGOS.ethereum };

  if (normalized.includes("erc20:")) {
    return { label: "ERC-20", icon: "/icons/chain-icons/token.svg" };
  }
  if (normalized.includes("spl:")) {
    return { label: "SPL", icon: "/icons/chain-icons/token.svg" };
  }

  return {
    label: assetId,
    icon: "/icons/chain-icons/token.svg",
  };
}

function createPlaceholderTokenImage(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const palette = colorFromSeed(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
<defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
<stop offset='0%' stop-color='${palette[0]}'/><stop offset='100%' stop-color='${palette[1]}'/>
</linearGradient></defs>
<circle cx='32' cy='32' r='32' fill='url(#g)'/>
<text x='32' y='37' text-anchor='middle' font-size='20' font-family='Inter, Arial, sans-serif' fill='white' font-weight='700'>${initials || "T"}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function colorFromSeed(seed: string): [string, string] {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  const hueA = Math.abs(hash) % 360;
  const hueB = (hueA + 48) % 360;
  return [`hsl(${hueA} 72% 46%)`, `hsl(${hueB} 78% 36%)`];
}

function formatCompactCurrency(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `$${value}`;
  if (amount >= 100_000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function tokenSymbol(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return cleaned.length > 0 ? cleaned.toUpperCase() : "TOKEN";
}

function progressToneClass(progressPct: number): string {
  if (progressPct >= 66) return "text-[#47BB64]";
  if (progressPct >= 33) return "text-[#f6d67d]";
  return "text-[#E24756]";
}

function statusLabel(status: LaunchpadCampaignItem["status"]): string {
  if (status === "active") return "Live";
  if (status === "finalized") return "Finalized";
  if (status === "draft") return "Draft";
  return "Cancelled";
}

function statusToneClass(status: LaunchpadCampaignItem["status"]): string {
  if (status === "active") return "text-[#47BB64]";
  if (status === "finalized") return "text-[#9cc1ff]";
  if (status === "draft") return "text-[#f6d67d]";
  return "text-[#E24756]";
}

function riskToneClass(score: number): string {
  if (score >= 70) return "text-[#E24756]";
  if (score >= 40) return "text-[#f6d67d]";
  return "text-[#47BB64]";
}
