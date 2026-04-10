"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { AssetTimeSeriesChart } from "@/components/market/asset-time-series-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { useAssetDetail } from "@/lib/hooks/wallets/use-asset-detail";
import { useAssetLive } from "@/lib/hooks/wallets/use-asset-live";
import { getChainIconById } from "@/lib/chain-icons";
import type { WalletSnapshot, WalletTokenPosition } from "@/modules/wallets/profile";
import type { AssetDetailRange, AssetLiveResponse } from "@/types/extension/asset-detail";

import { AssetDetailHeader } from "./asset-detail/asset-detail-header";
import { AssetInfoCard } from "./asset-detail/asset-info-card";
import { AssetPairsTable } from "./asset-detail/asset-pairs-table";
import { AssetSentimentCard } from "./asset-detail/asset-sentiment-card";

const RANGE_OPTIONS: AssetDetailRange[] = ["1d", "7d", "30d"];
type ChartMode = "line" | "bar" | "volume";
const CHART_MODES: ChartMode[] = ["line", "bar", "volume"];

const DEFAULT_SENTIMENT: AssetLiveResponse["sentiment"] = {
  label: "neutral",
  score: 50,
  confidence: 0,
  factors: [],
};

function toFinite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSupply(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function resolveChainId(token: WalletTokenPosition, wallet: WalletSnapshot): string {
  if (token.platform === "solana") return "101";
  if (typeof token.chainId === "number" && Number.isFinite(token.chainId) && token.chainId > 0) {
    return String(token.chainId);
  }
  const metadataChainId = toFinite(wallet.metadata?.chainId);
  if (metadataChainId !== null && metadataChainId > 0) {
    return String(metadataChainId);
  }
  return "1";
}

function resolveQueryAddress(token: WalletTokenPosition): string | undefined {
  if (token.isNative) return undefined;
  const candidate = String(token.contract || token.id || "").trim();
  if (!candidate) return undefined;
  if (candidate.startsWith("native-") || candidate.startsWith("default:")) return undefined;
  return candidate;
}

function chainLogoFromKey(chainKey: string): string {
  const key = String(chainKey || "").trim().toLowerCase();
  if (key === "solana") return LIQUID_GLASS_LOGOS.solana;
  if (key === "stellar" || key === "xlm") return "/icons/chain-icons/stellar.svg";

  const hexMatch = key.match(/^0x[0-9a-f]+$/i);
  if (hexMatch) {
    const parsed = Number.parseInt(key, 16);
    if (Number.isFinite(parsed) && parsed > 0) return getChainIconById(parsed);
  }

  const numeric = Number.parseInt(key, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return getChainIconById(numeric);
  }

  return getChainIconById(1);
}

type WalletAssetDetailPanelProps = {
  wallet: WalletSnapshot;
  token: WalletTokenPosition | null;
};

export function WalletAssetDetailPanel({ wallet, token }: WalletAssetDetailPanelProps) {
  const [range, setRange] = useState<AssetDetailRange>("1d");
  const [chartMode, setChartMode] = useState<ChartMode>("line");

  const chainId = token ? resolveChainId(token, wallet) : "1";
  const queryAddress = token ? resolveQueryAddress(token) : undefined;
  const querySymbol = token?.symbol ?? undefined;

  const { detail, isLoading: detailLoading } = useAssetDetail({
    chainId,
    address: queryAddress,
    symbol: querySymbol,
    range,
  });

  const { live } = useAssetLive({
    chainId,
    address: queryAddress,
    symbol: querySymbol,
  });

  const displayName = detail?.asset.name || token?.name || token?.symbol || "Asset";
  const displaySymbol = detail?.asset.symbol || token?.symbol || "-";

  const headerAddress = useMemo(() => {
    const primary = detail?.asset.contracts.find((entry) => entry.isPrimary)?.address;
    if (primary) return primary;
    return queryAddress || null;
  }, [detail?.asset.contracts, queryAddress]);

  const warnings = useMemo(() => {
    const merged = [...(detail?.warnings || []), ...(live?.warnings || [])];
    return [...new Set(merged.filter(Boolean))];
  }, [detail?.warnings, live?.warnings]);

  const exchangeRows = useMemo(
    () =>
      (detail?.exchanges || []).map((row) => ({
        primary: row.name,
        secondary: row.pair || row.marketType || null,
        metricA: formatCurrency(row.volumeUsd ?? null),
        metricB: row.trustScore ? `trust: ${row.trustScore}` : row.source,
        source: row.source,
      })),
    [detail?.exchanges],
  );

  const liquidityRows = useMemo(
    () =>
      (detail?.liquidityPairs || []).map((row) => ({
        primary: row.pairLabel,
        secondary: row.dexName || row.chainKey,
        metricA: formatCurrency(row.liquidityUsd ?? null),
        metricB:
          row.volume24hUsd !== null && row.volume24hUsd !== undefined
            ? `vol: ${formatCurrency(row.volume24hUsd)}`
            : row.source,
        source: row.source,
      })),
    [detail?.liquidityPairs],
  );

  const contracts = detail?.asset.contracts || [];

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Select an asset to view details.
      </div>
    );
  }

  const handleCopyAddress = async () => {
    if (!headerAddress) return;
    try {
      await navigator.clipboard.writeText(headerAddress);
      toast.success("Address copied");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-3 pb-4">
        <AssetDetailHeader
          name={displayName}
          symbol={displaySymbol}
          logoUrl={detail?.asset.logoUrl || token.logoURI}
          address={headerAddress}
          priceUsd={live?.priceUsd ?? token.priceUsd ?? null}
          change24hPct={live?.change24hPct ?? token.change24hPercent ?? null}
          onCopyAddress={handleCopyAddress}
        />

        {warnings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {warnings.map((warning) => (
              <span
                key={warning}
                className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200"
              >
                {warning}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <AssetInfoCard label="Market Cap" value={formatCurrency(live?.marketCapUsd ?? detail?.asset.marketCapUsd ?? null)} />
          <AssetInfoCard label="24H Volume" value={formatCurrency(live?.volume24hUsd ?? detail?.asset.volume24hUsd ?? null)} />
          <AssetInfoCard label="Max Supply" value={formatSupply(detail?.asset.maxSupply ?? null)} />
          <AssetInfoCard label="Total Supply" value={formatSupply(detail?.asset.totalSupply ?? null)} />
          <AssetInfoCard label="All-Time High" value={formatCurrency(detail?.asset.athUsd ?? null)} hint={detail?.asset.athDate || undefined} />
          <AssetInfoCard label="All-Time Low" value={formatCurrency(detail?.asset.atlUsd ?? null)} hint={detail?.asset.atlDate || undefined} />
        </div>

        <Card className="border-white/10 bg-[#c4c4c4]/5">
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant="ghost"
                    size="sm"
                    onClick={() => setRange(option)}
                    className={`h-7 px-2 text-[11px] uppercase ${
                      range === option ? "bg-white/10 text-white" : "text-zinc-400"
                    }`}
                  >
                    {option}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {CHART_MODES.map((mode) => (
                  <Button
                    key={mode}
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartMode(mode)}
                    className={`h-7 px-2 text-[11px] capitalize ${
                      chartMode === mode ? "bg-white/10 text-white" : "text-zinc-400"
                    }`}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <AssetTimeSeriesChart
              prices={detail?.charts.prices || []}
              totalVolumes={detail?.charts.totalVolumes || []}
              mode={chartMode}
            />

            <div className="text-[10px] text-zinc-500">
              24h change: {formatPercent(live?.change24hPct ?? token.change24hPercent ?? null)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#c4c4c4]/5">
          <CardContent className="space-y-2 p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Description</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              {detail?.asset.description || "Description is unavailable for this asset."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#c4c4c4]/5">
          <CardContent className="space-y-2 p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Contracts by Chain</div>
            {contracts.length > 0 ? (
              <div className="space-y-1.5">
                {contracts.map((contract) => (
                  <div
                    key={`${contract.chainKey}:${contract.address}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="relative h-3.5 w-3.5 overflow-hidden rounded-full border border-white/10">
                        <Image
                          src={chainLogoFromKey(contract.chainKey)}
                          alt={contract.chainName}
                          fill
                          sizes="14px"
                          className="object-cover"
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs text-white">{contract.chainName}</div>
                        <div className="truncate font-mono text-[10px] text-zinc-500">{contract.address}</div>
                      </div>
                    </div>
                    {contract.isPrimary ? (
                      <span className="rounded-full border border-blue-300/30 bg-blue-300/10 px-2 py-0.5 text-[10px] text-blue-200">
                        primary
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">No contract references available.</div>
            )}
          </CardContent>
        </Card>

        <AssetPairsTable
          title="Exchanges Listed On"
          rows={exchangeRows}
          emptyMessage="No exchange listings available."
        />

        <AssetPairsTable
          title="Liquidity Pairs"
          rows={liquidityRows}
          emptyMessage="No liquidity pairs available."
        />

        <AssetSentimentCard sentiment={live?.sentiment || DEFAULT_SENTIMENT} />

        {detailLoading ? (
          <div className="text-center text-[11px] text-zinc-500">Refreshing asset details...</div>
        ) : null}
      </div>
    </div>
  );
}
